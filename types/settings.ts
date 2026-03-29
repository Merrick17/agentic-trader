/**
 * User settings for autonomous agent configuration
 */
export interface AgentSettings {
  // Core settings
  autoTradingEnabled: boolean;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';

  // Trading limits
  maxTradeAmountUsd: number;
  maxConcurrentTrades: number;
  maxDailyTrades: number;

  // Confidence thresholds
  minConfidenceScore: number;
  minConfidenceForStrongBuy: number;

  // Market filters
  minLiquidityUsd: number;
  minVolume24hUsd: number;
  maxPriceImpactPercent: number;

  // Risk management
  stopLossPercent: number;
  takeProfit1Percent: number;
  takeProfit2Percent: number;
  trailingStopPercent: number;
  positionSizePercent: number;

  // Execution settings
  slippageBps: number;
  priorityFeeLamports: number;

  // Scanning settings
  scanIntervalMs: number;
  enabledSources: string[]; // ['dexscreener', 'birdeye', 'jupiter', 'pumpfun']

  // Token filters
  whitelistedTokens: string[]; // Token addresses or symbols
  blacklistedTokens: string[];

  // Notifications
  notifyOnTrade: boolean;
  notifyOnSignal: boolean;
  notifyOnError: boolean;

  // Metadata
  updatedAt: string;
  createdAt: string;
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  autoTradingEnabled: false,
  riskLevel: 'moderate',

  maxTradeAmountUsd: 100,
  maxConcurrentTrades: 3,
  maxDailyTrades: 20,

  minConfidenceScore: 75,
  minConfidenceForStrongBuy: 85,

  minLiquidityUsd: 10000,
  minVolume24hUsd: 5000,
  maxPriceImpactPercent: 2,

  stopLossPercent: 15,
  takeProfit1Percent: 50,
  takeProfit2Percent: 100,
  trailingStopPercent: 15,
  positionSizePercent: 5,

  slippageBps: 50,
  priorityFeeLamports: 100000,

  scanIntervalMs: 60000,
  enabledSources: ['dexscreener', 'birdeye', 'jupiter'],

  whitelistedTokens: [],
  blacklistedTokens: [],

  notifyOnTrade: true,
  notifyOnSignal: true,
  notifyOnError: true,

  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

// Preset configurations
export const RISK_PRESETS: Record<'conservative' | 'moderate' | 'aggressive', Partial<AgentSettings>> = {
  conservative: {
    maxTradeAmountUsd: 50,
    maxConcurrentTrades: 2,
    minConfidenceScore: 85,
    minLiquidityUsd: 50000,
    minVolume24hUsd: 20000,
    stopLossPercent: 10,
    takeProfit1Percent: 30,
    takeProfit2Percent: 60,
    positionSizePercent: 2,
    slippageBps: 30,
  },
  moderate: {
    maxTradeAmountUsd: 100,
    maxConcurrentTrades: 3,
    minConfidenceScore: 75,
    minLiquidityUsd: 10000,
    minVolume24hUsd: 5000,
    stopLossPercent: 15,
    takeProfit1Percent: 50,
    takeProfit2Percent: 100,
    positionSizePercent: 5,
    slippageBps: 50,
  },
  aggressive: {
    maxTradeAmountUsd: 250,
    maxConcurrentTrades: 5,
    minConfidenceScore: 65,
    minLiquidityUsd: 5000,
    minVolume24hUsd: 2000,
    stopLossPercent: 20,
    takeProfit1Percent: 100,
    takeProfit2Percent: 200,
    positionSizePercent: 10,
    slippageBps: 100,
  },
};
