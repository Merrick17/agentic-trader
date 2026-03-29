/**
 * Autonomous Agent Orchestrator
 *
 * This module enables fully autonomous trading where the agent:
 * - Scans markets continuously
 * - Generates signals automatically
 * - Executes trades based on configured parameters
 * - Learns from outcomes via RAG
 */

import { getTrendingTokens, getTokenPairs } from '@/lib/data/dexscreener';
import { getTokenData } from '@/lib/data/birdeye';
import { getPumpFunTokens } from '@/lib/data/pumpfun';
import { insertSignal, getPortfolio, getSignals } from '@/lib/astra/queries';
import { findSimilarDocuments, generateEmbedding, storeTradeOutcome } from '@/lib/astra/vector';
import { getConnection } from '@/lib/solana/connection';
import { executeJupiterSwap, getJupiterQuote } from '@/lib/solana/jupiter';
import type { Signal } from '@/types/signal';
import type { Trade } from '@/types/trade';
import { AGENT_SYSTEM_PROMPT } from './system-prompt';

// Agent state
export type AgentMode = 'idle' | 'scanning' | 'analyzing' | 'trading' | 'paused' | 'error';

export interface AgentState {
  mode: AgentMode;
  currentTask?: string;
  errorMessage?: string;
  lastScanAt?: Date;
  lastTradeAt?: Date;
  signalsGenerated: number;
  tradesExecuted: number;
  scanCount: number;
}

export interface AgentConfig {
  // Autonomous mode settings
  autonomousEnabled: boolean;
  scanIntervalMs: number;

  // Trading parameters
  autoTradingEnabled: boolean;
  maxTradeAmount: number;
  minConfidence: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';

  // Risk management
  maxPositions: number;
  maxDailyTrades: number;
  stopLossPct: number;
  takeProfitTiers: [number, number, number]; // TP1%, TP2%, trailing%

  // Filters
  minLiquidity: number;
  minVolume24h: number;
  whitelistedTokens: string[];
  blacklistedTokens: string[];

  // Strategy weights
  strategyWeights: {
    pumpfunMigration: number;
    volumeBreakout: number;
    smartMoneyFollow: number;
    dipBuyUptrend: number;
    narrativeAlpha: number;
  };
}

// Default configuration
export const DEFAULT_AUTONOMOUS_CONFIG: AgentConfig = {
  autonomousEnabled: false,
  scanIntervalMs: 60000, // 1 minute

  autoTradingEnabled: false,
  maxTradeAmount: 100,
  minConfidence: 75,
  riskLevel: 'moderate',

  maxPositions: 5,
  maxDailyTrades: 10,
  stopLossPct: 15,
  takeProfitTiers: [50, 100, 200],

  minLiquidity: 50000,
  minVolume24h: 100000,
  whitelistedTokens: [],
  blacklistedTokens: [],

  strategyWeights: {
    pumpfunMigration: 0.2,
    volumeBreakout: 0.3,
    smartMoneyFollow: 0.25,
    dipBuyUptrend: 0.15,
    narrativeAlpha: 0.1,
  },
};

// In-memory state (can be persisted to AstraDB)
let agentState: AgentState = {
  mode: 'idle',
  signalsGenerated: 0,
  tradesExecuted: 0,
  scanCount: 0,
};

let agentConfig: AgentConfig = { ...DEFAULT_AUTONOMOUS_CONFIG };
let scanTimer: NodeJS.Timeout | null = null;

// Get current state
export function getAgentState(): AgentState {
  return { ...agentState };
}

// Get current config
export function getAgentConfig(): AgentConfig {
  return { ...agentConfig };
}

// Update configuration
export function updateAgentConfig(config: Partial<AgentConfig>): void {
  agentConfig = { ...agentConfig, ...config };

  // Restart scanning if interval changed
  if (scanTimer && config.scanIntervalMs) {
    stopAutonomousMode();
    if (agentConfig.autonomousEnabled) {
      startAutonomousMode();
    }
  }
}

// Start autonomous mode
export function startAutonomousMode(): void {
  if (scanTimer) {
    clearInterval(scanTimer);
  }

  agentConfig.autonomousEnabled = true;
  agentState.mode = 'idle';

  console.log('[AutonomousAgent] Starting autonomous mode...');

  // Run initial scan immediately
  runAutonomousCycle();

  // Schedule regular scans
  scanTimer = setInterval(runAutonomousCycle, agentConfig.scanIntervalMs);
}

// Stop autonomous mode
export function stopAutonomousMode(): void {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }

  agentConfig.autonomousEnabled = false;
  agentState.mode = 'paused';
  agentState.currentTask = undefined;

  console.log('[AutonomousAgent] Autonomous mode stopped');
}

// Main autonomous cycle
export async function runAutonomousCycle(): Promise<void> {
  if (!agentConfig.autonomousEnabled) {
    return;
  }

  try {
    agentState.scanCount++;
    agentState.mode = 'scanning';
    agentState.currentTask = 'Scanning markets for opportunities';
    agentState.lastScanAt = new Date();

    console.log(`[AutonomousAgent] Scan cycle #${agentState.scanCount} started`);

    // Step 1: Fetch market data from multiple sources
    const opportunities = await scanMarkets();

    if (opportunities.length === 0) {
      agentState.mode = 'idle';
      agentState.currentTask = undefined;
      console.log('[AutonomousAgent] No opportunities found');
      return;
    }

    // Step 2: Analyze each opportunity
    agentState.mode = 'analyzing';
    agentState.currentTask = `Analyzing ${opportunities.length} opportunities`;

    const scoredSignals = await analyzeOpportunities(opportunities);

    // Step 3: Filter high-confidence signals
    const validSignals = scoredSignals.filter(
      s => s.confidence >= agentConfig.minConfidence
    );

    if (validSignals.length === 0) {
      agentState.mode = 'idle';
      agentState.currentTask = undefined;
      console.log('[AutonomousAgent] No high-confidence signals');
      return;
    }

    // Step 4: Sort by confidence and take top
    validSignals.sort((a, b) => b.confidence - a.confidence);
    const topSignals = validSignals.slice(0, 3);

    // Step 5: Log signals and optionally execute trades
    for (const signal of topSignals) {
      await processSignal(signal);
    }

    agentState.mode = 'idle';
    agentState.currentTask = undefined;

    console.log(`[AutonomousAgent] Scan cycle completed. Generated ${topSignals.length} signals`);

  } catch (error) {
    console.error('[AutonomousAgent] Cycle error:', error);
    agentState.mode = 'error';
    agentState.errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }
}

// Scan all data sources for opportunities
async function scanMarkets(): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];

  try {
    // Scan DexScreener trending
    const trending = await getTrendingTokens(50);
    for (const pair of trending) {
      if (meetsFilters(pair.liquidityUsd, pair.volume?.h24 || 0)) {
        opportunities.push({
          source: 'dexscreener',
          tokenAddress: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          volume24h: pair.volume?.h24 || 0,
          liquidity: pair.liquidityUsd || 0,
          marketCap: pair.marketCap || pair.fdv || 0,
          data: pair,
        });
      }
    }

    // Scan PumpFun tokens
    try {
      const pumpTokens = await getPumpFunTokens(30);
      for (const token of pumpTokens) {
        if (!opportunities.some(o => o.tokenAddress === token.address)) {
          opportunities.push({
            source: 'pumpfun',
            tokenAddress: token.address,
            symbol: token.symbol,
            name: token.name,
            price: token.price || 0,
            priceChange24h: 0,
            volume24h: token.volume24h || 0,
            liquidity: token.marketCap * 0.2 || 0,
            marketCap: token.marketCap || 0,
            data: token,
          });
        }
      }
    } catch (e) {
      // PumpFun may fail, continue
    }

  } catch (error) {
    console.error('[AutonomousAgent] Market scan error:', error);
  }

  // Remove duplicates by token address
  return opportunities.filter((opp, index, self) =>
    index === self.findIndex(o => o.tokenAddress === opp.tokenAddress)
  );
}

// Check if token meets filter criteria
function meetsFilters(liquidity: number, volume: number): boolean {
  return liquidity >= agentConfig.minLiquidity && volume >= agentConfig.minVolume24h;
}

// Analyze opportunities with AI
async function analyzeOpportunities(opportunities: Opportunity[]): Promise<ScoredSignal[]> {
  const scoredSignals: ScoredSignal[] = [];

  for (const opp of opportunities) {
    try {
      // Query RAG for similar past trades
      const ragQuery = `${opp.symbol} ${opp.name} - ${opp.source} token with ${opp.priceChange24h > 0 ? 'positive' : 'negative'} momentum, $${opp.volume24h} volume`;
      const ragResults = await queryRagMemory(ragQuery);

      // Calculate base score
      let score = calculateSignalScore(opp, ragResults);

      // Adjust based on RAG learnings
      if (ragResults.length > 0) {
        const avgOutcome = ragResults.reduce((acc, r) => acc + (r.metadata.pnl || 0), 0) / ragResults.length;
        const avgSimilarity = ragResults.reduce((acc, r) => acc + (r.similarity || 0), 0) / ragResults.length;

        // Boost score if similar trades were profitable
        if (avgOutcome > 0) {
          score += 5 * avgSimilarity;
        } else if (avgOutcome < 0) {
          score -= 5 * avgSimilarity;
        }
      }

      // Cap at 100
      score = Math.min(100, Math.max(0, score));

      // Determine sentiment
      const sentiment = score >= 70 ? 'bullish' : score >= 40 ? 'neutral' : 'bearish';

      scoredSignals.push({
        ...opp,
        confidence: Math.round(score),
        sentiment,
        ragInsights: ragResults.map(r => r.content).join('; '),
      });

    } catch (error) {
      console.error(`[AutonomousAgent] Analysis error for ${opp.symbol}:`, error);
    }
  }

  return scoredSignals;
}

// Calculate signal score
function calculateSignalScore(opp: Opportunity, ragResults: any[]): number {
  let score = 50; // Base score

  // Price momentum
  if (opp.priceChange24h > 20) score += 15;
  else if (opp.priceChange24h > 10) score += 10;
  else if (opp.priceChange24h > 5) score += 5;
  else if (opp.priceChange24h < -20) score -= 15;
  else if (opp.priceChange24h < -10) score -= 10;

  // Volume score
  const volumeToMcap = opp.marketCap > 0 ? opp.volume24h / opp.marketCap : 0;
  if (volumeToMcap > 0.5) score += 15;
  else if (volumeToMcap > 0.3) score += 10;
  else if (volumeToMcap > 0.1) score += 5;

  // Liquidity score
  if (opp.liquidity > 500000) score += 10;
  else if (opp.liquidity > 100000) score += 5;
  else if (opp.liquidity < 25000) score -= 10;

  // Source bonus
  if (opp.source === 'pumpfun') {
    // PumpFun early entry bonus
    if (opp.marketCap < 1000000) score += 10;
  }

  return score;
}

// Process a signal - log and optionally trade
async function processSignal(signal: ScoredSignal): Promise<void> {
  try {
    // Check if we already have a signal for this token
    const existingSignals = await getSignals({ tokenAddress: signal.tokenAddress }, 1);
    if (existingSignals.length > 0) {
      const lastSignal = existingSignals[0];
      const hoursSince = (Date.now() - new Date(lastSignal.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        console.log(`[AutonomousAgent] Skipping ${signal.symbol} - recent signal exists`);
        return;
      }
    }

    // Create and save signal
    const newSignal: Signal = {
      id: `signal_${Date.now()}_${signal.symbol}`,
      tokenAddress: signal.tokenAddress,
      tokenSymbol: signal.symbol,
      tokenName: signal.name,
      price: signal.price,
      priceChange24h: signal.priceChange24h,
      volume24h: signal.volume24h,
      marketCap: signal.marketCap,
      liquidity: signal.liquidity,
      confidence: signal.confidence,
      sentiment: signal.sentiment as 'bullish' | 'bearish' | 'neutral',
      source: 'autonomous_agent',
      timestamp: new Date(),
      metadata: {
        analysis: `Autonomous scan: ${signal.source} source. RAG insights: ${signal.ragInsights || 'none'}`,
        autoGenerated: true,
      },
      status: 'active',
    };

    await insertSignal(newSignal);
    agentState.signalsGenerated++;

    console.log(`[AutonomousAgent] Signal generated: ${signal.symbol} (${signal.confidence})`);

    // Execute trade if auto-trading is enabled
    if (agentConfig.autoTradingEnabled && signal.confidence >= agentConfig.minConfidence + 10) {
      await executeAutonomousTrade(newSignal);
    }

  } catch (error) {
    console.error(`[AutonomousAgent] Signal processing error:`, error);
  }
}

// Execute an autonomous trade
async function executeAutonomousTrade(signal: Signal): Promise<void> {
  try {
    agentState.mode = 'trading';
    agentState.currentTask = `Executing trade for ${signal.tokenSymbol}`;

    // Check position limits
    const portfolio = await getPortfolio();
    if (portfolio && portfolio.positions.length >= agentConfig.maxPositions) {
      console.log('[AutonomousAgent] Max positions reached, skipping trade');
      return;
    }

    // Check daily trade limit
    // TODO: Track daily trades in AstraDB

    // Calculate position size based on risk level
    const positionSize = calculatePositionSize(signal);

    console.log(`[AutonomousAgent] Executing trade: ${signal.tokenSymbol} for $${positionSize}`);

    // For now, log the trade intent (actual execution requires wallet integration)
    // TODO: Implement actual Jupiter swap execution

    // Log trade intent (WebSocket removed - using API polling instead)
    console.log('[AutonomousAgent] Trade intent logged for:', signal.tokenSymbol);

    agentState.tradesExecuted++;
    agentState.lastTradeAt = new Date();

  } catch (error) {
    console.error('[AutonomousAgent] Trade execution error:', error);
  }
}

// Calculate position size
function calculatePositionSize(signal: Signal): number {
  const baseSize = agentConfig.maxTradeAmount;
  const confidenceMultiplier = signal.confidence / 100;

  let riskMultiplier = 1;
  switch (agentConfig.riskLevel) {
    case 'conservative':
      riskMultiplier = 0.5;
      break;
    case 'moderate':
      riskMultiplier = 1;
      break;
    case 'aggressive':
      riskMultiplier = 1.5;
      break;
  }

  return Math.min(baseSize * confidenceMultiplier * riskMultiplier, agentConfig.maxTradeAmount);
}

// Query RAG memory
async function queryRagMemory(query: string): Promise<any[]> {
  try {
    const embedding = await generateEmbedding(query);
    return await findSimilarDocuments(embedding, { documentType: 'trade_outcome' }, 3);
  } catch (error) {
    return [];
  }
}

// Types
interface Opportunity {
  source: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  data: any;
}

interface ScoredSignal extends Opportunity {
  confidence: number;
  sentiment: string;
  ragInsights?: string;
}
