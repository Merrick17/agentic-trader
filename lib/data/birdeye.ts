import type { Signal } from '@/types/signal';
import axios from 'axios';

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

interface BirdeyeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holderCount: number;
}

interface BirdeyeResponse<T> {
  data: T;
  success: boolean;
}

/**
 * Get token metadata and price
 * Uses /defi/token_overview endpoint
 */
export async function getTokenInfo(tokenAddress: string, apiKey?: string): Promise<BirdeyeToken | null> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/defi/token_overview`,
      {
        params: { address: tokenAddress },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    const result: BirdeyeResponse<BirdeyeToken> = response.data;
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching Birdeye token info:', error);
    return null;
  }
}

/**
 * Get token price history
 * Uses /defi/history_price endpoint
 */
export async function getTokenPriceHistory(
  tokenAddress: string,
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' = '1d',
  apiKey?: string
): Promise<{ timestamp: number; price: number }[] | null> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/defi/history_price`,
      {
        params: { address: tokenAddress, type: timeframe },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    const result: BirdeyeResponse<{ items: { unixTime: number; value: number }[] }> = response.data;

    if (!result.success) return null;

    return result.data.items.map((item) => ({
      timestamp: item.unixTime * 1000,
      price: item.value,
    }));
  } catch (error) {
    console.error('Error fetching Birdeye price history:', error);
    return null;
  }
}

/**
 * Get top traders for a token
 * Uses /defi/v2/tokens/top_traders endpoint
 */
export async function getTokenTopTraders(
  tokenAddress: string,
  limit = 20,
  apiKey?: string
): Promise<Array<{
  address: string;
  volume: number;
  pnl?: number;
  tradeCount?: number;
  buyRatio?: number;
}> | null> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/defi/v2/tokens/top_traders`,
      {
        params: {
          address: tokenAddress,
          time_frame: '24h',
          sort_by: 'volume',
          sort_type: 'desc',
          limit: limit,
          offset: 0,
        },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    const result: BirdeyeResponse<{
      items: Array<{
        owner: string;
        volume: number;
        trade: number;
        tradeBuy: number;
        tradeSell: number;
        volumeBuy: number;
        volumeSell: number;
        tags?: string[];
      }>;
    }> = response.data;

    if (!result.success || !result.data?.items) return null;

    return result.data.items.map((item) => ({
      address: item.owner,
      volume: item.volume,
      tradeCount: item.trade,
      buyRatio: item.trade > 0 ? item.tradeBuy / item.trade : 0.5,
    }));
  } catch (error) {
    console.error('Error fetching Birdeye top traders:', error);
    return null;
  }
}

/**
 * Get OHLCV data for charting
 * Uses /defi/v3/ohlcv endpoint (V3 with 1s, 15s, 30s support)
 */
export async function getOHLCV(
  tokenAddress: string,
  timeframe: string,
  timeFrom: number,
  timeTo: number,
  apiKey?: string
): Promise<{ items: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> } | null> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/defi/v3/ohlcv`,
      {
        params: {
          address: tokenAddress,
          type: timeframe,
          time_from: timeFrom,
          time_to: timeTo,
          currency: 'usd',
        },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    const data = response.data;
    const items = data.data?.items?.map((item: {
      unix_time: number;
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
    }) => ({
      time: item.unix_time,
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
    }));

    return { items: items || [] };
  } catch (error) {
    console.error('Error fetching Birdeye OHLCV:', error);
    return null;
  }
}

/**
 * Get token list (V3)
 * Uses /defi/v3/token/list endpoint
 */
export async function getTokenList(
  opts: {
    sort_by?: string;
    sort_type?: string;
    limit?: number;
    offset?: number;
  },
  apiKey?: string
): Promise<unknown> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/defi/v3/token/list`,
      {
        params: {
          sort_by: opts.sort_by ?? 'v24hUSD',
          sort_type: opts.sort_type ?? 'desc',
          limit: opts.limit ?? 50,
          offset: opts.offset ?? 0,
        },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching Birdeye token list:', error);
    return null;
  }
}

/**
 * Get recent trades for a token
 * Uses /defi/v3/token/txs endpoint
 */
export async function getRecentTrades(
  address: string,
  limit = 50,
  minValueUsd?: number,
  apiKey?: string
): Promise<unknown> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/defi/v3/token/txs`,
      {
        params: {
          address,
          limit,
          tx_type: 'swap',
          offset: 0,
        },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    const data = response.data;
    if (minValueUsd && data.data?.items) {
      data.data.items = data.data.items.filter((t: { value?: number }) => (t.value || 0) >= minValueUsd);
    }
    return data;
  } catch (error) {
    console.error('Error fetching Birdeye recent trades:', error);
    return null;
  }
}

/**
 * Get wallet PnL summary
 * Uses /wallet/v2/pnl-summary endpoint
 */
export async function getWalletPnL(wallet: string, apiKey?: string): Promise<unknown> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/wallet/v2/pnl-summary`,
      {
        params: { wallet },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching Birdeye wallet PnL:', error);
    return null;
  }
}

/**
 * Convert Birdeye token to Signal format
 */
export function convertToSignal(token: BirdeyeToken, confidence: number): Signal {
  return {
    id: `birdeye_${token.address}_${Date.now()}`,
    tokenAddress: token.address,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    price: token.price,
    priceChange24h: token.priceChange24h,
    volume24h: token.volume24h,
    marketCap: token.marketCap,
    liquidity: token.liquidity,
    confidence,
    sentiment: token.priceChange24h > 5 ? 'bullish' : token.priceChange24h < -5 ? 'bearish' : 'neutral',
    source: 'birdeye',
    timestamp: new Date(),
    metadata: {
      holderCount: token.holderCount,
      decimals: token.decimals,
    },
    status: 'active',
  };
}

/**
 * Alias for getTokenInfo
 */
export async function getTokenData(tokenAddress: string, apiKey?: string): Promise<BirdeyeToken | null> {
  return getTokenInfo(tokenAddress, apiKey);
}

/**
 * Get wallet transaction history
 * Uses /defi/txs endpoint
 */
export async function getWalletHistory(
  walletAddress: string,
  limit = 50,
  apiKey?: string
): Promise<{ tokenAddress: string; side: 'buy' | 'sell'; amount: number; timestamp: number }[] | null> {
  if (!apiKey) {
    console.warn('Birdeye API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${BIRDEYE_API_BASE}/defi/txs`,
      {
        params: { address: walletAddress, limit },
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    const result: BirdeyeResponse<{ items: { tokenAddress: string; side: 'buy' | 'sell'; amount: number; blockUnixTime: number }[] }> = response.data;

    if (!result.success) return null;

    return result.data.items.map((item) => ({
      tokenAddress: item.tokenAddress,
      side: item.side,
      amount: item.amount,
      timestamp: item.blockUnixTime * 1000,
    }));
  } catch (error) {
    console.error('Error fetching Birdeye wallet history:', error);
    return null;
  }
}
