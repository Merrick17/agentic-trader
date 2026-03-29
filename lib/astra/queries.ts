import { db } from './client';
import { COLLECTIONS } from './collections';
import type { Signal, SignalFilter } from '@/types/signal';
import type { Trade, TradeHistoryFilters } from '@/types/trade';
import type { Portfolio, Position } from '@/types/portfolio';

// Signal queries
export async function getSignals(filter?: SignalFilter, limit = 50): Promise<Signal[]> {
  const collection = db.collection(COLLECTIONS.SIGNALS);

  const filterDoc: Record<string, unknown> = {};

  if (filter?.minConfidence) {
    filterDoc.confidence = { $gte: filter.minConfidence };
  }

  if (filter?.minLiquidity) {
    filterDoc.liquidity = { $gte: filter.minLiquidity };
  }

  if (filter?.minVolume24h) {
    filterDoc.volume_24h = { $gte: filter.minVolume24h };
  }

  if (filter?.sentiment?.length) {
    filterDoc.sentiment = { $in: filter.sentiment };
  }

  if (filter?.source?.length) {
    filterDoc.source = { $in: filter.source };
  }

  const cursor = collection.find(filterDoc).sort({ timestamp: -1 }).limit(limit);
  const documents = await cursor.toArray();

  return documents.map(doc => ({
    id: doc.id,
    tokenAddress: doc.token_address,
    tokenSymbol: doc.token_symbol,
    tokenName: doc.token_name,
    price: doc.price,
    priceChange24h: doc.price_change_24h,
    volume24h: doc.volume_24h,
    marketCap: doc.market_cap,
    liquidity: doc.liquidity,
    confidence: doc.confidence,
    sentiment: doc.sentiment,
    source: doc.source,
    timestamp: new Date(doc.timestamp),
    metadata: doc.metadata,
    status: doc.status,
  }));
}

export async function insertSignal(signal: Signal): Promise<void> {
  const collection = db.collection(COLLECTIONS.SIGNALS);

  await collection.insertOne({
    id: signal.id,
    token_address: signal.tokenAddress,
    token_symbol: signal.tokenSymbol,
    token_name: signal.tokenName,
    price: signal.price,
    price_change_24h: signal.priceChange24h,
    volume_24h: signal.volume24h,
    market_cap: signal.marketCap,
    liquidity: signal.liquidity,
    confidence: signal.confidence,
    sentiment: signal.sentiment,
    source: signal.source,
    timestamp: signal.timestamp,
    metadata: signal.metadata,
    status: signal.status,
  });
}

// Trade queries
export async function getTrades(filter?: TradeHistoryFilters, limit = 50): Promise<Trade[]> {
  const collection = db.collection(COLLECTIONS.TRADES);

  const filterDoc: Record<string, unknown> = {};

  if (filter?.tokenAddress) {
    filterDoc.token_address = filter.tokenAddress;
  }

  if (filter?.side) {
    filterDoc.side = filter.side;
  }

  if (filter?.status) {
    filterDoc.status = filter.status;
  }

  if (filter?.startDate || filter?.endDate) {
    filterDoc.timestamp = {};
    if (filter.startDate) {
      (filterDoc.timestamp as Record<string, Date>).$gte = filter.startDate;
    }
    if (filter.endDate) {
      (filterDoc.timestamp as Record<string, Date>).$lte = filter.endDate;
    }
  }

  const cursor = collection.find(filterDoc).sort({ timestamp: -1 }).limit(limit);
  const documents = await cursor.toArray();

  return documents.map(doc => ({
    id: doc.id,
    signalId: doc.signal_id,
    tokenAddress: doc.token_address,
    tokenSymbol: doc.token_symbol,
    side: doc.side,
    amount: doc.amount,
    price: doc.price,
    totalValue: doc.total_value,
    slippage: doc.slippage,
    fee: doc.fee,
    status: doc.status,
    txHash: doc.tx_hash,
    timestamp: new Date(doc.timestamp),
    executedAt: doc.executed_at ? new Date(doc.executed_at) : undefined,
    failedAt: doc.failed_at ? new Date(doc.failed_at) : undefined,
    errorMessage: doc.error_message,
  }));
}

export async function insertTrade(trade: Trade): Promise<void> {
  const collection = db.collection(COLLECTIONS.TRADES);

  await collection.insertOne({
    id: trade.id,
    signal_id: trade.signalId,
    token_address: trade.tokenAddress,
    token_symbol: trade.tokenSymbol,
    side: trade.side,
    amount: trade.amount,
    price: trade.price,
    total_value: trade.totalValue,
    slippage: trade.slippage,
    fee: trade.fee,
    status: trade.status,
    tx_hash: trade.txHash,
    timestamp: trade.timestamp,
    executed_at: trade.executedAt,
    failed_at: trade.failedAt,
    error_message: trade.errorMessage,
  });
}

export async function updateTradeStatus(
  tradeId: string,
  status: Trade['status'],
  updates?: { txHash?: string; errorMessage?: string; executedAt?: Date }
): Promise<void> {
  const collection = db.collection(COLLECTIONS.TRADES);

  const updateDoc: Record<string, unknown> = { status };

  if (updates?.txHash) {
    updateDoc.tx_hash = updates.txHash;
  }

  if (updates?.errorMessage) {
    updateDoc.error_message = updates.errorMessage;
  }

  if (updates?.executedAt) {
    updateDoc.executed_at = updates.executedAt;
  }

  if (status === 'failed') {
    updateDoc.failed_at = new Date();
  }

  await collection.updateOne(
    { id: tradeId },
    { $set: updateDoc }
  );
}

// Portfolio queries
export async function getPortfolio(): Promise<Portfolio | null> {
  const collection = db.collection(COLLECTIONS.PORTFOLIO);
  const doc = await collection.findOne({ id: 'main' });

  if (!doc) {
    return null;
  }

  return {
    id: doc.id,
    totalValue: doc.total_value,
    costBasis: doc.cost_basis,
    totalRealizedPnL: doc.total_realized_pnl,
    totalUnrealizedPnL: doc.total_unrealized_pnl,
    totalPnLPercentage: doc.total_pnl_percentage,
    positions: (doc.positions || []).map((pos: Record<string, unknown>) => ({
      id: pos.id,
      tokenAddress: pos.token_address,
      tokenSymbol: pos.token_symbol,
      tokenName: pos.token_name,
      balance: pos.balance,
      avgEntryPrice: pos.avg_entry_price,
      currentPrice: pos.current_price,
      totalValue: pos.total_value,
      costBasis: pos.cost_basis,
      unrealizedPnL: pos.unrealized_pnl,
      unrealizedPnLPercentage: pos.unrealized_pnl_percentage,
      allocationPercentage: pos.allocation_percentage,
      lastUpdated: new Date(pos.last_updated as string),
    })),
    lastUpdated: new Date(doc.last_updated),
  };
}

export async function updatePortfolio(portfolio: Portfolio): Promise<void> {
  const collection = db.collection(COLLECTIONS.PORTFOLIO);

  await collection.updateOne(
    { id: 'main' },
    {
      $set: {
        total_value: portfolio.totalValue,
        cost_basis: portfolio.costBasis,
        total_realized_pnl: portfolio.totalRealizedPnL,
        total_unrealized_pnl: portfolio.totalUnrealizedPnL,
        total_pnl_percentage: portfolio.totalPnLPercentage,
        positions: portfolio.positions.map(pos => ({
          id: pos.id,
          token_address: pos.tokenAddress,
          token_symbol: pos.tokenSymbol,
          token_name: pos.tokenName,
          balance: pos.balance,
          avg_entry_price: pos.avgEntryPrice,
          current_price: pos.currentPrice,
          total_value: pos.totalValue,
          cost_basis: pos.costBasis,
          unrealized_pnl: pos.unrealizedPnL,
          unrealized_pnl_percentage: pos.unrealizedPnLPercentage,
          allocation_percentage: pos.allocationPercentage,
          last_updated: pos.lastUpdated,
        })),
        last_updated: portfolio.lastUpdated,
      }
    },
    { upsert: true }
  );
}
