'use client';

import { useEffect, useRef } from 'react';
import { useAgentStore } from './useAgentStore';

/**
 * Hook to scan tokens and detect volume surges
 */
export const useTokenScanner = (intervalMs = 10000) => {
  const { setTokenList, addAlert } = useAgentStore();
  const prevVolumes = useRef<Record<string, number>>({});

  useEffect(() => {
    const poll = async () => {
      try {
        // Fetch from server proxy (keeps API keys server-side)
        const [birdeyeRes, dexRes] = await Promise.all([
          fetch('/api/data/token-list'),
          fetch('/api/data/trending'),
        ]);

        const [birdeye, dex] = await Promise.all([
          birdeyeRes.ok ? birdeyeRes.json() : null,
          dexRes.ok ? dexRes.json() : null,
        ]);

        // Merge token data from multiple sources
        const tokens = birdeye?.data?.tokens || [];

        // Transform to common format
        const formattedTokens = tokens.map((t: {
          address: string;
          symbol: string;
          name: string;
          price: number;
          priceChange24h: number;
          volume24h: number;
          liquidity: number;
          marketCap: number;
          holderCount?: number;
        }) => ({
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          price: t.price || 0,
          priceChange24h: t.priceChange24h || 0,
          volume24h: t.volume24h || 0,
          liquidity: t.liquidity || 0,
          marketCap: t.marketCap || 0,
          holders: t.holderCount,
        }));

        setTokenList(formattedTokens);

        // Detect volume surges
        formattedTokens.forEach((t: { address: string; symbol: string; volume24h: number }) => {
          const prev = prevVolumes.current[t.address];
          if (prev && t.volume24h > prev * 2) {
            addAlert({
              type: 'VOLUME_SURGE',
              mint: t.address,
              symbol: t.symbol,
              multiplier: t.volume24h / prev,
              ts: Date.now(),
            });
          }
          prevVolumes.current[t.address] = t.volume24h;
        });
      } catch (e) {
        console.error('Token scanner error:', e);
      }
    };

    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, setTokenList, addAlert]);
};

/**
 * Hook to poll price data
 */
export const usePriceFeed = (intervalMs = 15000) => {
  const { tokenList, setTokenList } = useAgentStore();

  useEffect(() => {
    if (tokenList.length === 0) return;

    const poll = async () => {
      try {
        // Get prices for top tokens
        const mints = tokenList.slice(0, 20).map((t) => t.address);
        const res = await fetch(`/api/data/prices?mints=${mints.join(',')}`);
        if (res.ok) {
          const prices = await res.json();
          // Update token prices
          setTokenList(
            tokenList.map((t) => ({
              ...t,
              price: prices.data?.[t.address]?.price || t.price,
            }))
          );
        }
      } catch (e) {
        console.error('Price feed error:', e);
      }
    };

    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [tokenList, intervalMs, setTokenList]);
};

/**
 * Hook to fetch top traders
 */
export const useTopTraders = (tokenAddress: string | null, intervalMs = 30000) => {
  const { setTopTraders } = useAgentStore();

  useEffect(() => {
    if (!tokenAddress) return;

    const fetchTraders = async () => {
      try {
        const res = await fetch(`/api/data/top-traders?mint=${tokenAddress}`);
        if (res.ok) {
          const data = await res.json();
          // Transform to trader format
          const traders = data.data?.items?.map((item: {
            address: string;
            volume: number;
            pnl?: number;
            tradeCount?: number;
          }) => ({
            wallet: item.address,
            volume24h: item.volume || 0,
            tradeCount: item.tradeCount || 0,
            buyRatio: 0.5, // Would need to calculate from trade data
            estimatedPnl: item.pnl,
          })) || [];
          setTopTraders(traders);
        }
      } catch (e) {
        console.error('Top traders error:', e);
      }
    };

    fetchTraders();
    const id = setInterval(fetchTraders, intervalMs);
    return () => clearInterval(id);
  }, [tokenAddress, intervalMs, setTopTraders]);
};
