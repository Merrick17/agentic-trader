'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Portfolio, PortfolioSnapshot } from '@/types/portfolio';

interface UsePortfolioReturn {
  portfolio: Portfolio | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePortfolio(): UsePortfolioReturn {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/portfolio');

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
      }

      const data = await response.json();
      setPortfolio(data.portfolio);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();

    // Refresh every 60 seconds
    const interval = setInterval(fetchPortfolio, 60000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  return { portfolio, isLoading, error, refetch: fetchPortfolio };
}

// Hook for portfolio history/chart data
export function usePortfolioHistory(days = 30) {
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/portfolio/history?days=${days}`);
        const data = await response.json();
        setHistory(data.history);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [days]);

  return { history, isLoading, error };
}

// Calculate portfolio metrics
export function usePortfolioMetrics(portfolio: Portfolio | null) {
  if (!portfolio) {
    return {
      totalValue: 0,
      totalPnL: 0,
      totalPnLPercentage: 0,
      positionCount: 0,
      bestPerformer: null,
      worstPerformer: null,
    };
  }

  const positions = portfolio.positions;
  const bestPerformer = positions.length > 0
    ? positions.reduce((best, pos) => pos.unrealizedPnLPercentage > best.unrealizedPnLPercentage ? pos : best)
    : null;
  const worstPerformer = positions.length > 0
    ? positions.reduce((worst, pos) => pos.unrealizedPnLPercentage < worst.unrealizedPnLPercentage ? pos : worst)
    : null;

  return {
    totalValue: portfolio.totalValue,
    totalPnL: portfolio.totalUnrealizedPnL,
    totalPnLPercentage: portfolio.totalPnLPercentage,
    positionCount: positions.length,
    bestPerformer,
    worstPerformer,
  };
}
