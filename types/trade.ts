export interface Trade {
  id: string;
  signalId?: string;
  tokenAddress: string;
  tokenSymbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  totalValue: number;
  slippage: number;
  fee: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  txHash?: string;
  timestamp: Date;
  executedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  metadata?: {
    userId?: string;
    [key: string]: unknown;
  };
}

export interface TradeHistoryFilters {
  tokenAddress?: string;
  side?: Trade['side'];
  status?: Trade['status'];
  startDate?: Date;
  endDate?: Date;
}

export interface TradePnL {
  tradeId: string;
  tokenAddress: string;
  tokenSymbol: string;
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  realizedPnL: number;
  unrealizedPnL: number;
  pnlPercentage: number;
}
