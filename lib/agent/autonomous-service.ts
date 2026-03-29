/**
 * Autonomous Trading Agent Service
 *
 * Runs continuously in the background, scanning for opportunities
 * and executing trades autonomously when confidence is high.
 */

import { getDb } from '@/lib/astra/client';
import { COLLECTIONS, ensureCollection } from '@/lib/astra/collections';
import { getTrendingTokens as getDexTrendingTokens, getBoostedTokens } from '@/lib/data/dexscreener';
import { getTokenInfo } from '@/lib/data/birdeye';
import { calculateConfidenceScore, calculateLiquidityScore, calculateVolumeScore, calculateMomentumScore } from './scoring';
import type { AgentSettings } from '@/types/settings';
import { DEFAULT_AGENT_SETTINGS } from '@/types/settings';

// State
let isRunning = false;
let scanInterval: NodeJS.Timeout | null = null;
let lastScanAt: Date | null = null;
let totalScans = 0;
let totalTrades = 0;
let currentWalletAddress: string | null = null;
let currentSettings: AgentSettings = DEFAULT_AGENT_SETTINGS;

// Fallback to env if no user settings
const FALLBACK_ENABLED = process.env.AUTO_TRADING_ENABLED === 'true';

interface TradingOpportunity {
  tokenAddress: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  confidence: number;
  source: string;
  reasons: string[];
}

interface TradeState {
  id: string;
  tokenAddress: string;
  side: 'buy' | 'sell';
  amountUsd: number;
  entryPrice: number;
  status: 'pending' | 'executed' | 'failed';
  confidence: number;
  createdAt: string;
}

const activeTrades: Map<string, TradeState> = new Map();

/**
 * Set the wallet address for autonomous trading
 */
export function setWalletAddress(address: string) {
  currentWalletAddress = address;
  console.log('[AUTONOMOUS] Wallet address set:', address);
}

/**
 * Get current wallet address
 */
export function getWalletAddress(): string | null {
  return currentWalletAddress;
}

/**
 * Load user settings from database
 */
async function loadUserSettings(): Promise<AgentSettings> {
  if (!currentWalletAddress) return DEFAULT_AGENT_SETTINGS;

  try {
    await ensureCollection(COLLECTIONS.USER_SETTINGS);
    const settingsDoc = await getDb()
      .collection<AgentSettings & { _id: string; user_id: string }>(COLLECTIONS.USER_SETTINGS)
      .findOne({ user_id: currentWalletAddress });

    if (settingsDoc) {
      const { _id, user_id, ...settings } = settingsDoc;
      currentSettings = { ...DEFAULT_AGENT_SETTINGS, ...settings };
      return currentSettings;
    }
  } catch (error) {
    console.error('[AUTONOMOUS] Failed to load user settings:', error);
  }

  return DEFAULT_AGENT_SETTINGS;
}

/**
 * Check if autonomous trading is enabled
 */
export function isEnabled(): boolean {
  return (currentSettings.autoTradingEnabled || FALLBACK_ENABLED) && isRunning;
}

/**
 * Get current settings
 */
export function getSettings(): AgentSettings {
  return currentSettings;
}

/**
 * Get service status
 */
export function getStatus() {
  return {
    isRunning,
    isEnabled: currentSettings.autoTradingEnabled || FALLBACK_ENABLED,
    lastScanAt,
    totalScans,
    totalTrades,
    activeTrades: activeTrades.size,
    currentWallet: currentWalletAddress,
    settings: currentSettings,
  };
}

/**
 * Start the autonomous trading loop
 */
export async function start(walletAddress?: string) {
  if (isRunning) {
    console.log('[AUTONOMOUS] Already running');
    return;
  }

  if (walletAddress) {
    setWalletAddress(walletAddress);
  }

  // Load user settings
  await loadUserSettings();

  if (!currentSettings.autoTradingEnabled && !FALLBACK_ENABLED) {
    console.warn('[AUTONOMOUS] Cannot start - auto trading disabled in settings');
    return;
  }

  if (walletAddress) {
    setWalletAddress(walletAddress);
  }

  if (!currentWalletAddress) {
    console.error('[AUTONOMOUS] Cannot start - no wallet address configured');
    return;
  }

  isRunning = true;
  console.log('[AUTONOMOUS] Starting autonomous trading loop...', {
    settings: currentSettings,
  });

  // Run initial scan immediately
  await performScan();

  // Set up recurring scans using user settings
  scanInterval = setInterval(async () => {
    await performScan();
  }, currentSettings.scanIntervalMs);
}

/**
 * Stop the autonomous trading loop
 */
export function stop() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  isRunning = false;
  console.log('[AUTONOMOUS] Stopped');
}

/**
 * Perform a single market scan and execute trades
 */
async function performScan() {
  lastScanAt = new Date();
  totalScans++;

  // Reload settings periodically to pick up user changes
  await loadUserSettings();

  console.log(`[AUTONOMOUS] Scan #${totalScans} starting...`, {
    minConfidence: currentSettings.minConfidenceScore,
    minLiquidity: currentSettings.minLiquidityUsd,
  });

  try {
    // Find opportunities
    const opportunities = await findOpportunities();
    console.log(`[AUTONOMOUS] Found ${opportunities.length} opportunities`);

    // Check how many active trades we have
    const activeCount = activeTrades.size;
    const availableSlots = currentSettings.maxConcurrentTrades - activeCount;

    if (availableSlots <= 0) {
      console.log('[AUTONOMOUS] No available trade slots (max concurrent reached)');
      return;
    }

    // Execute trades for top opportunities
    for (const opp of opportunities.slice(0, availableSlots)) {
      await executeOpportunity(opp);
    }

    // Check existing trades for exit opportunities
    await checkExitConditions();

  } catch (error) {
    console.error('[AUTONOMOUS] Scan error:', error);
  }
}

/**
 * Find trading opportunities by scanning multiple sources
 */
async function findOpportunities(): Promise<TradingOpportunity[]> {
  const opportunities: TradingOpportunity[] = [];

  try {
    // Scan trending tokens
    const trending = await getDexTrendingTokens(30);
    for (const pair of trending) {
      if ((pair.liquidityUsd || 0) < currentSettings.minLiquidityUsd) continue;
      if ((pair.volume?.h24 || 0) < currentSettings.minVolume24hUsd) continue;

      // Skip if already in an active trade
      if (activeTrades.has(pair.baseToken.address)) continue;

      // Check blacklist/whitelist
      if (currentSettings.blacklistedTokens.includes(pair.baseToken.symbol.toUpperCase())) continue;
      if (currentSettings.whitelistedTokens.length > 0 &&
          !currentSettings.whitelistedTokens.includes(pair.baseToken.symbol.toUpperCase())) {
        // If whitelist is set, only include whitelisted tokens
        continue;
      }

      const confidence = calculateConfidenceScore({
        liquidity: calculateLiquidityScore(pair.liquidityUsd || 0),
        volume: calculateVolumeScore(pair.volume?.h24 || 0, pair.fdv || pair.marketCap || 1),
        priceMomentum: calculateMomentumScore(pair.priceChange?.h24 || 0),
        smartMoney: 50,
        tokenomics: 50,
        socialSentiment: 50,
      });

      if (confidence >= currentSettings.minConfidenceScore) {
        opportunities.push({
          tokenAddress: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          volume24h: pair.volume?.h24 || 0,
          liquidity: pair.liquidityUsd || 0,
          marketCap: pair.marketCap || pair.fdv || 0,
          confidence,
          source: 'trending',
          reasons: [
            `Trending on DexScreener`,
            `Liquidity: $${(pair.liquidityUsd || 0).toLocaleString()}`,
            `Volume: $${(pair.volume?.h24 || 0).toLocaleString()}/24h`,
            `Price: ${pair.priceChange?.h24 || 0}%`,
          ],
        });
      }
    }

    // Scan boosted tokens
    const boosted = await getBoostedTokens();
    for (const boost of boosted.slice(0, 15)) {
      if (activeTrades.has(boost.tokenAddress)) continue;

      try {
        const info = await getTokenInfo(boost.tokenAddress, process.env.BIRDEYE_API_KEY || '');
        if (!info) continue;
        if (info.liquidity < currentSettings.minLiquidityUsd) continue;
        if (info.volume24h < currentSettings.minVolume24hUsd) continue;

        // Check blacklist/whitelist
        if (currentSettings.blacklistedTokens.includes(info.symbol.toUpperCase())) continue;

        const confidence = calculateConfidenceScore({
          liquidity: calculateLiquidityScore(info.liquidity),
          volume: calculateVolumeScore(info.volume24h, info.marketCap),
          priceMomentum: calculateMomentumScore(info.priceChange24h),
          smartMoney: 60, // Boosted = marketing activity
          tokenomics: 50,
          socialSentiment: 70,
        });

        if (confidence >= currentSettings.minConfidenceScore) {
          opportunities.push({
            tokenAddress: info.address,
            symbol: info.symbol,
            name: info.name,
            price: info.price,
            priceChange24h: info.priceChange24h,
            volume24h: info.volume24h,
            liquidity: info.liquidity,
            marketCap: info.marketCap,
            confidence,
            source: 'boosted',
            reasons: [
              `DexScreener boosted (active marketing)`,
              `Liquidity: $${info.liquidity.toLocaleString()}`,
              `Confidence: ${confidence}`,
            ],
          });
        }
      } catch (e) {
        console.error('[AUTONOMOUS] Error processing boosted token:', boost.tokenAddress, e);
      }
    }

    // Sort by confidence
    opportunities.sort((a, b) => b.confidence - a.confidence);

  } catch (error) {
    console.error('[AUTONOMOUS] Error finding opportunities:', error);
  }

  return opportunities;
}

/**
 * Execute a trade for an opportunity
 */
async function executeOpportunity(opp: TradingOpportunity) {
  console.log('[AUTONOMOUS] Executing opportunity:', opp.symbol, opp.confidence);

  try {
    await ensureCollection(COLLECTIONS.TRADES);

    const tradeId = crypto.randomUUID();
    const solMint = 'So11111111111111111111111111111111111111112';

    // Use user settings for trade parameters
    const amountUsd = currentSettings.maxTradeAmountUsd;
    const slippageDecimal = currentSettings.slippageBps / 10000;

    // Create trade record
    const tradeRecord = {
      _id: tradeId,
      token_address: opp.tokenAddress,
      token_symbol: opp.symbol,
      side: 'buy' as const,
      amount: amountUsd,
      price: opp.price,
      total_value: amountUsd,
      slippage: slippageDecimal,
      status: 'pending' as const,
      timestamp: new Date().toISOString(),
      confidence: opp.confidence,
      reason: opp.reasons.join('. '),
      source: opp.source,
      input_mint: solMint,
      output_mint: opp.tokenAddress,
      user_id: currentWalletAddress,
      is_autonomous: true,
    };

    await getDb().collection(COLLECTIONS.TRADES).insertOne(tradeRecord);

    // Track as active trade
    activeTrades.set(opp.tokenAddress, {
      id: tradeId,
      tokenAddress: opp.tokenAddress,
      side: 'buy',
      amountUsd: currentSettings.maxTradeAmountUsd,
      entryPrice: opp.price,
      status: 'pending',
      confidence: opp.confidence,
      createdAt: new Date().toISOString(),
    });

    totalTrades++;

    console.log(`[AUTONOMOUS] Trade created: ${opp.symbol} - $${currentSettings.maxTradeAmountUsd} (confidence: ${opp.confidence})`);

    // Log to agent logs
    try {
      await ensureCollection(COLLECTIONS.AGENT_LOGS);
      await getDb().collection(COLLECTIONS.AGENT_LOGS).insertOne({
        _id: crypto.randomUUID(),
        type: 'autonomous_trade',
        action: 'buy',
        token_address: opp.tokenAddress,
        token_symbol: opp.symbol,
        amount_usd: currentSettings.maxTradeAmountUsd,
        confidence: opp.confidence,
        reasons: opp.reasons,
        trade_id: tradeId,
        timestamp: new Date().toISOString(),
        user_id: currentWalletAddress,
      });
    } catch (e) {
      console.error('[AUTONOMOUS] Error logging to agent_logs:', e);
    }

  } catch (error) {
    console.error('[AUTONOMOUS] Error executing opportunity:', error);
  }
}

/**
 * Check existing trades for exit conditions
 */
async function checkExitConditions() {
  // This would normally check current prices against entry prices
  // and trigger sells when TP/SL conditions are met
  // For now, this is a placeholder for future implementation

  console.log('[AUTONOMOUS] Checking exit conditions for', activeTrades.size, 'active trades');

  // TODO: Implement real-time price monitoring and auto-exit
  // - Fetch current prices for all active trade tokens
  // - Compare against entry price
  // - Trigger sell if TP (take profit) or SL (stop loss) hit
  // - Update trade status in database
}

/**
 * Get active trades
 */
export function getActiveTrades() {
  return Array.from(activeTrades.values());
}

/**
 * Get trade history from database
 */
export async function getTradeHistory(limit = 50) {
  try {
    await ensureCollection(COLLECTIONS.TRADES);
    const cursor = getDb()
      .collection(COLLECTIONS.TRADES)
      .find({ is_autonomous: true, user_id: currentWalletAddress })
      .sort({ timestamp: -1 })
      .limit(limit);

    return await cursor.toArray();
  } catch (error) {
    console.error('[AUTONOMOUS] Error getting trade history:', error);
    return [];
  }
}

/**
 * Get performance stats
 */
export async function getPerformanceStats() {
  try {
    const trades = await getTradeHistory(1000);
    const closedTrades = trades.filter((t: any) => t.status === 'executed' || t.status === 'closed');

    const wins = closedTrades.filter((t: any) => (t.pnl_percentage || 0) > 0);
    const losses = closedTrades.filter((t: any) => (t.pnl_percentage || 0) <= 0);

    const totalPnl = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl_usd || 0), 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    return {
      totalScans,
      totalTrades,
      activeTrades: activeTrades.size,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round(winRate * 100) / 100,
      totalPnlUsd: totalPnl,
      avgWin: wins.length > 0 ? wins.reduce((sum: number, t: any) => sum + (t.pnl_usd || 0), 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((sum: number, t: any) => sum + (t.pnl_usd || 0), 0) / losses.length : 0,
    };
  } catch (error) {
    console.error('[AUTONOMOUS] Error getting performance stats:', error);
    return null;
  }
}
