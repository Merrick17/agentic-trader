export interface Position {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  balance: number;
  avgEntryPrice: number;
  currentPrice: number;
  totalValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  allocationPercentage: number;
  lastUpdated: Date;
}

export interface Portfolio {
  id: string;
  totalValue: number;
  costBasis: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalPnLPercentage: number;
  positions: Position[];
  lastUpdated: Date;
}

export interface PortfolioSnapshot {
  timestamp: Date;
  totalValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
}

export interface TokenAllocation {
  tokenAddress: string;
  tokenSymbol: string;
  percentage: number;
  value: number;
}
