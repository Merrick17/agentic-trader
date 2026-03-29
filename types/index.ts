// Re-export all types from individual files
export * from './agent';
export * from './signal';
export * from './trade';
export * from './portfolio';

// Additional types for the trading bot
export type Token = {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders?: number;
};

export type Trader = {
  wallet: string;
  volume24h: number;
  tradeCount: number;
  buyRatio: number;
  estimatedPnl?: number;
  strategy?: 'SCALPER' | 'SWING' | 'ACCUMULATOR' | 'WHALE_DUMP';
  strategyConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  tags?: string[];
};

export type OHLCVCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Alert = {
  type: 'VOLUME_SURGE' | 'WHALE_BUY' | 'WHALE_SELL' | 'NEW_LISTING' | 'SMART_MONEY_ENTRY' | 'RUG_RISK';
  mint: string;
  symbol: string;
  multiplier?: number;
  message?: string;
  ts: number;
};

export type SwapQuote = {
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: unknown[];
  slippageBps: number;
};

export type TradingSignal = {
  verdict: 'BUY' | 'WATCH' | 'AVOID';
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};
