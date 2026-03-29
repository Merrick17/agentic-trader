'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Trade, TradeHistoryFilters } from '@/types/trade';

interface UseTradesOptions {
  filter?: TradeHistoryFilters;
  limit?: number;
}

interface UseTradesReturn {
  trades: Trade[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTrades(options: UseTradesOptions = {}): UseTradesReturn {
  const { filter, limit = 50 } = options;
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrades = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (filter?.tokenAddress) params.append('tokenAddress', filter.tokenAddress);
      if (filter?.side) params.append('side', filter.side);
      if (filter?.status) params.append('status', filter.status);

      const response = await fetch(`/api/trades?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.statusText}`);
      }

      const data = await response.json();
      setTrades(data.trades);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => {
    fetchTrades();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  return { trades, isLoading, error, refetch: fetchTrades };
}

// Hook for a specific trade
export function useTrade(tradeId: string) {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTrade() {
      try {
        const response = await fetch(`/api/trades?id=${tradeId}`);
        const data = await response.json();
        setTrade(data.trade);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    if (tradeId) {
      fetchTrade();
    }
  }, [tradeId]);

  return { trade, isLoading, error };
}
