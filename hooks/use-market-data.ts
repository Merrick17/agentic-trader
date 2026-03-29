'use client';

import { useState, useEffect, useCallback } from 'react';

interface MarketToken {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

interface UseMarketDataReturn {
  tokens: MarketToken[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Top Solana ecosystem tokens to track
const TRACKED_TOKENS = [
  'SOL', 'BONK', 'JUP', 'WIF', 'POPCAT', 'MEW', 'BOME', 'W', 'RAY', 'FIDA'
];

export function useMarketData(pollInterval = 15000): UseMarketDataReturn {
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setError(null);

      // Fetch from our API endpoint
      const response = await fetch('/api/market/ticker', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.statusText}`);
      }

      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (err) {
      console.error('useMarketData error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();

    // Poll for updates
    const interval = setInterval(fetchMarketData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchMarketData, pollInterval]);

  return { tokens, isLoading, error, refetch: fetchMarketData };
}

// Hook for individual token price tracking
export function useTokenPrice(tokenAddress: string, pollInterval = 10000) {
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrice = useCallback(async () => {
    try {
      const response = await fetch(`/api/market/price?address=${tokenAddress}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setPrice(data.price);
        setPriceChange24h(data.priceChange24h || 0);
      }
    } catch (err) {
      console.error('useTokenPrice error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, pollInterval);
    return () => clearInterval(interval);
  }, [fetchPrice, pollInterval]);

  return { price, priceChange24h, isLoading, refetch: fetchPrice };
}
