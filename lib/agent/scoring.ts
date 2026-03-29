import { SIGNAL_SCORING_WEIGHTS } from './system-prompt';
import type { Signal } from '@/types/signal';

interface ScoringFactors {
  liquidity: number; // 0-100
  volume: number; // 0-100
  priceMomentum: number; // 0-100
  smartMoney: number; // 0-100
  tokenomics: number; // 0-100
  socialSentiment: number; // 0-100
}

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidenceScore(factors: ScoringFactors): number {
  const score =
    factors.liquidity * SIGNAL_SCORING_WEIGHTS.liquidity +
    factors.volume * SIGNAL_SCORING_WEIGHTS.volume +
    factors.priceMomentum * SIGNAL_SCORING_WEIGHTS.priceMomentum +
    factors.smartMoney * SIGNAL_SCORING_WEIGHTS.smartMoney +
    factors.tokenomics * SIGNAL_SCORING_WEIGHTS.tokenomics +
    factors.socialSentiment * SIGNAL_SCORING_WEIGHTS.socialSentiment;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Determine sentiment based on scoring factors
 */
export function determineSentiment(factors: ScoringFactors): Signal['sentiment'] {
  const bullishScore =
    factors.priceMomentum * 0.4 +
    factors.volume * 0.3 +
    factors.smartMoney * 0.3;

  const bearishScore =
    (100 - factors.priceMomentum) * 0.4 +
    (100 - factors.volume) * 0.3 +
    (100 - factors.smartMoney) * 0.3;

  if (bullishScore > bearishScore + 20) return 'bullish';
  if (bearishScore > bullishScore + 20) return 'bearish';
  return 'neutral';
}

/**
 * Calculate a liquidity score based on raw liquidity amount
 */
export function calculateLiquidityScore(liquidityUSD: number): number {
  if (liquidityUSD >= 1_000_000) return 100;
  if (liquidityUSD >= 500_000) return 90;
  if (liquidityUSD >= 250_000) return 80;
  if (liquidityUSD >= 100_000) return 70;
  if (liquidityUSD >= 50_000) return 60;
  if (liquidityUSD >= 25_000) return 40;
  if (liquidityUSD >= 10_000) return 20;
  return 0;
}

/**
 * Calculate volume score based on volume/market cap ratio
 */
export function calculateVolumeScore(volume24h: number, marketCap: number): number {
  if (marketCap === 0) return 0;

  const ratio = volume24h / marketCap;

  if (ratio >= 1.0) return 100;
  if (ratio >= 0.5) return 90;
  if (ratio >= 0.25) return 80;
  if (ratio >= 0.1) return 70;
  if (ratio >= 0.05) return 60;
  if (ratio >= 0.025) return 40;
  if (ratio >= 0.01) return 20;
  return 10;
}

/**
 * Calculate price momentum score based on price change
 */
export function calculateMomentumScore(priceChange24h: number): number {
  // Score based on positive momentum, but not too extreme
  const normalizedChange = Math.abs(priceChange24h);

  if (priceChange24h > 0) {
    // Positive momentum
    if (normalizedChange >= 100) return 100;
    if (normalizedChange >= 50) return 90;
    if (normalizedChange >= 25) return 80;
    if (normalizedChange >= 10) return 70;
    if (normalizedChange >= 5) return 60;
    if (normalizedChange >= 2) return 50;
    return 40;
  } else {
    // Negative momentum - score drops significantly
    if (normalizedChange >= 50) return 10;
    if (normalizedChange >= 25) return 20;
    if (normalizedChange >= 10) return 30;
    if (normalizedChange >= 5) return 35;
    return 40;
  }
}

/**
 * Calculate smart money score based on wallet analysis
 */
export function calculateSmartMoneyScore(params: {
  topHolderConcentration: number; // % held by top 10 holders
  devWalletActivity: 'accumulating' | 'selling' | 'neutral';
  sniperWallets: number; // Number of sniper wallets
  insiderWallets: number; // Number of insider wallets
}): number {
  let score = 50;

  // Lower concentration is better (more distributed)
  if (params.topHolderConcentration < 20) score += 20;
  else if (params.topHolderConcentration < 40) score += 10;
  else if (params.topHolderConcentration > 60) score -= 20;

  // Dev wallet activity
  if (params.devWalletActivity === 'accumulating') score += 15;
  else if (params.devWalletActivity === 'selling') score -= 30;

  // Sniper presence (too many is bad)
  if (params.sniperWallets > 10) score -= 20;
  else if (params.sniperWallets > 5) score -= 10;

  // Insider presence (presence of known successful wallets is good)
  if (params.insiderWallets > 0) score += 15;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate tokenomics score
 */
export function calculateTokenomicsScore(params: {
  mintAuthority: boolean;
  freezeAuthority: boolean;
  liquidityLocked: boolean;
  liquidityLockDuration: number; // days
  taxRate: number; // %
  maxWallet: number; // % of supply
}): number {
  let score = 50;

  // Authorities (removing these is good)
  if (!params.mintAuthority) score += 15;
  else score -= 20;

  if (!params.freezeAuthority) score += 10;
  else score -= 15;

  // Liquidity lock
  if (params.liquidityLocked) {
    score += 15;
    if (params.liquidityLockDuration > 365) score += 10;
  } else {
    score -= 30;
  }

  // Tax rate (lower is better)
  if (params.taxRate === 0) score += 15;
  else if (params.taxRate <= 5) score += 5;
  else if (params.taxRate > 10) score -= 20;

  // Max wallet (anti-whale protection)
  if (params.maxWallet > 0 && params.maxWallet <= 5) score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Grade a signal based on confidence and other factors
 */
export function gradeSignal(signal: Signal): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  shouldTrade: boolean;
  recommendedPosition: 'large' | 'medium' | 'small' | 'none';
} {
  if (signal.confidence >= 90) {
    return { grade: 'A', shouldTrade: true, recommendedPosition: 'large' };
  }
  if (signal.confidence >= 80) {
    return { grade: 'B', shouldTrade: true, recommendedPosition: 'medium' };
  }
  if (signal.confidence >= 70) {
    return { grade: 'C', shouldTrade: true, recommendedPosition: 'small' };
  }
  if (signal.confidence >= 60) {
    return { grade: 'D', shouldTrade: false, recommendedPosition: 'none' };
  }
  return { grade: 'F', shouldTrade: false, recommendedPosition: 'none' };
}
