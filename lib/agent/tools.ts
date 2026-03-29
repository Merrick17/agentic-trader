import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import {
  getTokenPairs,
  searchTokens,
  getTrendingTokens as getDexTrendingTokens,
  getBoostedTokens,
} from '@/lib/data/dexscreener';
import {
  getTokenInfo,
  getTokenTopTraders,
  getWalletHistory,
  getTokenPriceHistory,
  convertToSignal as convertBirdeyeToSignal,
} from '@/lib/data/birdeye';
import {
  getQuote,
  getSwapTransaction,
} from '@/lib/data/jupiter';
import { getDb } from '@/lib/astra/client';
import { COLLECTIONS, ensureCollection } from '@/lib/astra/collections';
import { calculateConfidenceScore, calculateLiquidityScore, calculateVolumeScore, calculateMomentumScore } from './scoring';

// Jupiter API key from environment
const JUP_API_KEY = process.env.JUPITER_API_KEY || '';
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '';
const JUP = 'https://api.jup.ag';

// Auto-trading configuration
const AUTO_TRADING_ENABLED = process.env.AUTO_TRADING_ENABLED === 'true';
const MAX_TRADE_AMOUNT_USD = parseFloat(process.env.MAX_TRADE_AMOUNT_USD || '100');
const MIN_CONFIDENCE_SCORE = parseInt(process.env.MIN_CONFIDENCE_SCORE || '75');
const SLIPPAGE_BPS = parseInt(process.env.SLIPPAGE_BPS || '50');

// ─── Well-known token mints (instant lookup, no API call) ──────────────────
const WELL_KNOWN_MINTS: Record<string, string> = {
  SOL:    'So11111111111111111111111111111111111111112',
  WSOL:   'So11111111111111111111111111111111111111112',
  USDC:   'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT:   'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK:   'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP:    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  WIF:    'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  BOME:   'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
  MEW:    'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
  RAY:    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA:   'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};

/**
 * Resolve a token name, symbol, or mint address to a mint address.
 * First checks the well-known cache, then falls back to Jupiter token search.
 */
async function resolveTokenToMint(query: string): Promise<{
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
} | null> {
  const q = query.trim();

  // 1. If it looks like a base58 mint address (32-44 chars), use it directly
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
    return { mint: q, symbol: q.slice(0, 6) + '...', name: q, decimals: 9 };
  }

  // 2. Check well-known cache (case-insensitive)
  const upper = q.toUpperCase();
  if (WELL_KNOWN_MINTS[upper]) {
    const mint = WELL_KNOWN_MINTS[upper];
    return { mint, symbol: upper, name: upper, decimals: upper === 'USDC' || upper === 'USDT' ? 6 : 9 };
  }

  // 3. Search Jupiter token list
  try {
    const res = await axios.get(`${JUP}/tokens/v1/search`, {
      params: { query: q, limit: 5 },
      headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {},
      validateStatus: () => true,
    });
    if (res.status !== 200) return null;
    // Response is an array of token objects
    const tokens: Array<{ address: string; symbol: string; name: string; decimals: number; logoURI?: string }> =
      Array.isArray(res.data) ? res.data : (res.data?.tokens ?? []);
    if (!tokens.length) return null;

    // Prefer exact symbol match, fall back to first result
    const exact = tokens.find((t) => t.symbol.toLowerCase() === q.toLowerCase());
    const best = exact ?? tokens[0];
    return { mint: best.address, symbol: best.symbol, name: best.name, decimals: best.decimals, logoURI: best.logoURI };
  } catch (err) {
    console.error('[resolveTokenToMint] error:', err);
    return null;
  }
}

// Helper to get Birdeye OHLCV data
async function fetchOHLCV(
  tokenAddress: string,
  timeframe: string,
  from: number,
  to: number
): Promise<{ items: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> } | null> {
  try {
    const BE = 'https://public-api.birdeye.so';
    console.log(`[TOOL] fetchOHLCV → ${tokenAddress} | timeframe=${timeframe}`);
    const res = await axios.get(`${BE}/defi/v3/ohlcv`, {
      params: { address: tokenAddress, type: timeframe, time_from: from, time_to: to },
      headers: { 'X-API-KEY': BIRDEYE_API_KEY, 'x-chain': 'solana' },
    });
    const items = res.data?.data?.items ?? res.data?.items ?? [];
    console.log(`[TOOL] fetchOHLCV ← ${res.status} | ${items.length} candles`);
    return res.data;
  } catch (error) {
    console.error('[TOOL] fetchOHLCV error:', error);
    return null;
  }
}

// Helper to fetch wallet PnL from Birdeye
async function fetchWalletPnL(wallet: string): Promise<unknown> {
  try {
    const BE = 'https://public-api.birdeye.so';
    console.log(`[TOOL] fetchWalletPnL → ${wallet}`);
    const res = await axios.get(`${BE}/wallet/v2/pnl-summary`, {
      params: { wallet },
      headers: { 'X-API-KEY': BIRDEYE_API_KEY, 'x-chain': 'solana' },
    });
    console.log(`[TOOL] fetchWalletPnL ← ${res.status} | data:`, JSON.stringify(res.data).slice(0, 200));
    return res.data;
  } catch (error) {
    console.error('[TOOL] fetchWalletPnL error:', error);
    return null;
  }
}

// Helper to get token prices from Jupiter — accepts mints OR symbols
async function fetchJupiterPrices(queries: string[]): Promise<unknown> {
  try {
    // Guard: ensure we have a valid array
    if (!Array.isArray(queries) || queries.length === 0) {
      console.warn('[TOOL] fetchJupiterPrices: called with empty/undefined queries');
      return { error: 'No token queries provided. Pass at least one symbol like ["SOL"] or ["BONK"].' };
    }
    console.log(`[TOOL] fetchJupiterPrices → resolving: ${queries.join(', ')}`);
    const resolved = await Promise.all(
      queries.map(async (q) => {
        const info = await resolveTokenToMint(q);
        if (info) console.log(`  [resolve] "${q}" → ${info.mint} (${info.symbol})`);
        else console.warn(`  [resolve] "${q}" → could not resolve`);
        return info ? { ...info, originalQuery: q } : null;
      })
    );
    const valid = resolved.filter(Boolean) as Array<{ mint: string; symbol: string; name: string; originalQuery: string }>;
    if (!valid.length) return { error: 'No tokens could be resolved', queries };

    const mints = valid.map((v) => v.mint);
    console.log(`[TOOL] fetchJupiterPrices → GET /price/v3 ids=${mints.join(',')}`);
    const res = await axios.get(`${JUP}/price/v3`, {
      params: { ids: mints.join(',') },
      headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {},
    });
    console.log(`[TOOL] fetchJupiterPrices ← ${res.status} | raw data:`, JSON.stringify(res.data).slice(0, 300));

    // Enrich price data with resolved symbol/name
    const raw: Record<string, { price: string; id: string }> = res.data?.data ?? {};
    const enriched: Record<string, unknown> = {};
    for (const v of valid) {
      const priceEntry = raw[v.mint];
      enriched[v.symbol] = priceEntry
        ? { price: parseFloat(priceEntry.price), mint: v.mint, symbol: v.symbol, name: v.name }
        : { error: 'price not found', mint: v.mint, symbol: v.symbol };
    }
    console.log(`[TOOL] fetchJupiterPrices result:`, JSON.stringify(enriched));
    return enriched;
  } catch (error) {
    console.error('[TOOL] fetchJupiterPrices error:', error);
    return null;
  }
}

// Helper to get trending tokens from Jupiter
async function fetchJupiterTrending(interval = '1h', limit = 20): Promise<unknown> {
  try {
    console.log(`[TOOL] fetchJupiterTrending → interval=${interval} limit=${limit}`);
    const res = await axios.get(`${JUP}/tokens/v2/toptrending/${interval}`, {
      params: { limit },
      headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {},
    });
    console.log(`[TOOL] fetchJupiterTrending ← ${res.status} | ${Array.isArray(res.data) ? res.data.length : '?'} tokens`);
    return res.data;
  } catch (error) {
    console.error('[TOOL] fetchJupiterTrending error:', error);
    return null;
  }
}

// Helper to get Jupiter quote
async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps = 50
): Promise<unknown> {
  try {
    console.log(`[TOOL] fetchJupiterQuote → ${inputMint} → ${outputMint} | amount=${amount} slippage=${slippageBps}bps`);
    const res = await axios.get(`${JUP}/swap/v1/quote`, {
      params: { inputMint, outputMint, amount, slippageBps, restrictIntermediateTokens: true },
      headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {},
    });
    console.log(`[TOOL] fetchJupiterQuote ← ${res.status} | outAmount=${res.data?.outAmount} priceImpact=${res.data?.priceImpactPct}`);
    return res.data;
  } catch (error) {
    console.error('[TOOL] fetchJupiterQuote error:', error);
    return null;
  }
}

// Helper to get new listings
async function fetchNewListings(limit = 20, meme = true): Promise<unknown> {
  try {
    const BE = 'https://public-api.birdeye.so';
    console.log(`[TOOL] fetchNewListings → limit=${limit} meme=${meme}`);
    const res = await axios.get(`${BE}/defi/v2/tokens/new_listing`, {
      params: { limit, meme_platform_enabled: meme },
      headers: { 'X-API-KEY': BIRDEYE_API_KEY, 'x-chain': 'solana' },
    });
    const items = res.data?.data?.items ?? [];
    console.log(`[TOOL] fetchNewListings ← ${res.status} | ${items.length} listings`);
    return res.data;
  } catch (error) {
    console.error('[TOOL] fetchNewListings error:', error);
    return null;
  }
}

// Helper to get meme token list
async function fetchMemeTokenList(limit = 50): Promise<unknown> {
  try {
    const BE = 'https://public-api.birdeye.so';
    console.log(`[TOOL] fetchMemeTokenList → limit=${limit}`);
    const res = await axios.get(`${BE}/defi/v3/token/meme-list`, {
      params: { sort_by: 'v24hUSD', sort_type: 'desc', limit },
      headers: { 'X-API-KEY': BIRDEYE_API_KEY, 'x-chain': 'solana' },
    });
    console.log(`[TOOL] fetchMemeTokenList ← ${res.status}`);
    return res.data;
  } catch (error) {
    console.error('[TOOL] fetchMemeTokenList error:', error);
    return null;
  }
}

// Helper to get recent trades
async function fetchRecentTrades(
  address: string,
  limit = 50,
  minValueUsd?: number
): Promise<unknown> {
  try {
    const BE = 'https://public-api.birdeye.so';
    const res = await axios.get(`${BE}/defi/v3/token/txs`, {
      params: {
        address,
        limit: limit,
        tx_type: 'swap',
        offset: 0,
      },
      headers: {
        'X-API-KEY': BIRDEYE_API_KEY,
        'x-chain': 'solana',
      },
    });
    const data = res.data;
    if (minValueUsd && data.data?.items) {
      data.data.items = data.data.items.filter((t: { value?: number }) => (t.value || 0) >= minValueUsd);
    }
    return data;
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    return null;
  }
}

// Token type for internal use
interface Token {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
}

// Export agent tools using Vercel AI SDK format
export const agentTools = (walletPublicKey: string) => ({
  // ── DISCOVERY ──────────────────────────────────────────────

  getTrendingTokens: tool({
    description: 'Get top trending tokens on Solana by volume or rank. Use when scanning for hot tokens or market overview.',
    inputSchema: z.object({
      interval: z.enum(['5m', '1h', '6h', '24h']).default('1h').describe('Time interval for trending data'),
      limit: z.number().min(1).max(50).default(20).describe('Number of tokens to return'),
      source: z.enum(['jupiter', 'birdeye', 'meme', 'dexscreener']).default('birdeye').describe('Data source'),
    }),
    execute: async ({ interval, limit, source }) => {
      if (source === 'jupiter') {
        return fetchJupiterTrending(interval, limit);
      }
      if (source === 'meme') {
        return fetchMemeTokenList(limit);
      }
      if (source === 'dexscreener') {
        const pairs = await getDexTrendingTokens(limit);
        return pairs.map((p) => ({
          address: p.baseToken.address,
          symbol: p.baseToken.symbol,
          name: p.baseToken.name,
          price: parseFloat(p.priceUsd) || 0,
          priceChange24h: p.priceChange?.h24 || 0,
          volume24h: p.volume?.h24 || 0,
          marketCap: p.marketCap || p.fdv || 0,
          liquidity: p.liquidityUsd || 0,
        }));
      }
      // Default birdeye
      const token = await getTokenInfo('So11111111111111111111111111111111111111112', BIRDEYE_API_KEY);
      return token ? [convertBirdeyeToSignal(token, 50)] : [];
    },
  }),

  getTopBoostedTokens: tool({
    description: 'Get tokens with most active DexScreener boosts — often indicates upcoming pumps or marketing pushes.',
    inputSchema: z.object({}),
    execute: async () => {
      const tokens = await getBoostedTokens();
      return tokens.map((t: any) => ({
        address: t.tokenAddress,
        amount: t.amount,
        totalAmount: t.totalAmount,
      }));
    },
  }),

  getNewListings: tool({
    description: 'Get brand new token listings on Solana. Use for finding early opportunities.',
    inputSchema: z.object({
      limit: z.number().default(20),
      includeMeme: z.boolean().default(true),
    }),
    execute: async ({ limit, includeMeme }) => {
      return fetchNewListings(limit, includeMeme);
    },
  }),

  resolveToken: tool({
    description:
      'Resolve a token name, symbol, or mint address to its mint address and metadata. ' +
      'Use this FIRST whenever the user mentions a token by name or ticker (e.g. "SOL", "Bonk", "WIF") ' +
      'before calling getTokenPrices, getTokenOverview, getTokenPools, etc.',
    inputSchema: z.object({
      query: z.string().describe('Token name, symbol (e.g. "SOL", "BONK"), or mint address'),
    }),
    execute: async ({ query }) => {
      const result = await resolveTokenToMint(query);
      if (!result) return { error: `Could not resolve token "${query}"` };
      return result;
    },
  }),

  searchToken: tool({
    description: 'Search DexScreener for pairs by a free-text query. Good for discovering unknown tokens by name/symbol.',
    inputSchema: z.object({
      query: z.string().describe('Token name, symbol, or contract address'),
    }),
    execute: async ({ query }) => {
      return searchTokens(query);
    },
  }),

  // ── TOKEN ANALYSIS ─────────────────────────────────────────

  getTokenOverview: tool({
    description: 'Get full token stats: price, volume 24h, market cap, FDV, holders, liquidity, price changes 1h/4h/24h. Essential first step for any token analysis.',
    inputSchema: z.object({
      tokenAddress: z.string().describe('Solana token mint address'),
    }),
    execute: async ({ tokenAddress }) => {
      return getTokenInfo(tokenAddress, BIRDEYE_API_KEY);
    },
  }),

  getTokenSecurity: tool({
    description: 'Check token security: mint authority, freeze authority, top10 holder concentration, rug risk indicators. Always call before recommending a buy.',
    inputSchema: z.object({
      tokenAddress: z.string().describe('Solana token mint address'),
    }),
    execute: async ({ tokenAddress }) => {
      const info = await getTokenInfo(tokenAddress, BIRDEYE_API_KEY);
      return {
        tokenAddress,
        securityInfo: info ? {
          holderCount: info.holderCount,
          decimals: info.decimals,
        } : null,
        note: 'Security check completed. For full audit, consider using additional security scanners.',
      };
    },
  }),

  getTokenPools: tool({
    description: 'Get all liquidity pools for a token from DexScreener: price, volume, liquidity, txn counts, price changes per pool.',
    inputSchema: z.object({
      tokenAddress: z.string().describe('Solana token mint address'),
    }),
    execute: async ({ tokenAddress }) => {
      return getTokenPairs(tokenAddress);
    },
  }),

  getOHLCV: tool({
    description: 'Get OHLCV candlestick data for charting or technical analysis (RSI, MACD, support/resistance).',
    inputSchema: z.object({
      tokenAddress: z.string().describe('Solana token mint address'),
      interval: z.enum(['1m', '5m', '15m', '30m', '1H', '4H', '1D']).default('15m'),
      hoursBack: z.number().default(24).describe('How many hours of historical data to fetch'),
    }),
    execute: async ({ tokenAddress, interval, hoursBack }) => {
      const now = Math.floor(Date.now() / 1000);
      const from = now - hoursBack * 3600;
      return fetchOHLCV(tokenAddress, interval, from, now);
    },
  }),

  getTokenPrices: tool({
    description:
      'Get real-time USD price(s) for Solana tokens from Jupiter. ' +
      'Pass a comma-separated string of symbols. Examples: "SOL" | "JUP" | "SOL,BONK,JUP". ' +
      'Symbols are resolved automatically — no mint address needed.',
    inputSchema: z.object({
      symbols: z.string().min(1).describe('Comma-separated token symbols. Examples: "SOL" or "JUP,BONK,WIF"'),
    }),
    execute: async ({ symbols }) => {
      const queries = (symbols ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      console.log('[TOOL] getTokenPrices symbols:', symbols, '→ queries:', queries);
      if (!queries.length) return { error: 'No symbols provided' };
      return fetchJupiterPrices(queries);
    },
  }),

  getRecentTrades: tool({
    description: 'Get the most recent swap transactions for a token. Shows buy/sell pressure and whale activity.',
    inputSchema: z.object({
      tokenAddress: z.string(),
      limit: z.number().default(50),
      minValueUsd: z.number().optional().describe('Filter trades above this USD value (for whale detection)'),
    }),
    execute: async ({ tokenAddress, limit, minValueUsd }) => {
      return fetchRecentTrades(tokenAddress, limit, minValueUsd);
    },
  }),

  // ── TRADER ANALYSIS ────────────────────────────────────────

  getTopTraders: tool({
    description: 'Get top traders for a token ranked by volume or PnL. Returns wallet addresses, trade counts, buy/sell ratio, and smart money tags.',
    inputSchema: z.object({
      tokenAddress: z.string(),
      timeframe: z.enum(['30m', '1h', '2h', '4h', '6h', '8h', '12h', '24h']).default('24h'),
      sortBy: z.enum(['volume', 'PnL']).default('volume'),
      limit: z.number().default(10),
    }),
    execute: async ({ tokenAddress, timeframe, sortBy, limit }) => {
      return getTokenTopTraders(tokenAddress, limit, BIRDEYE_API_KEY);
    },
  }),

  getWalletPnL: tool({
    description: 'Analyze a specific wallet\'s PnL, win rate, best/worst trades. Use after getTopTraders to deep-dive a specific wallet.',
    inputSchema: z.object({
      walletAddress: z.string().describe('Solana wallet public key'),
    }),
    execute: async ({ walletAddress }) => {
      return fetchWalletPnL(walletAddress);
    },
  }),

  classifyTraderStrategy: tool({
    description: 'Classify a trader\'s strategy based on their trade history. Returns SCALPER, SWING, ACCUMULATOR, or WHALE_DUMP with confidence score.',
    inputSchema: z.object({
      walletAddress: z.string(),
      recentTradeCount: z.number().describe('Number of trades in last 24h'),
      avgHoldTimeSeconds: z.number().describe('Average time between buy and sell in seconds'),
      buyToSellRatio: z.number().describe('Ratio of buys to sells (e.g. 0.8 = 80% buys)'),
      volumeUsd24h: z.number(),
    }),
    execute: async ({ avgHoldTimeSeconds, buyToSellRatio, volumeUsd24h, recentTradeCount }) => {
      let strategy: string;
      let confidence: string;

      if (avgHoldTimeSeconds < 120) {
        strategy = 'SCALPER';
        confidence = recentTradeCount > 20 ? 'HIGH' : 'MEDIUM';
      } else if (avgHoldTimeSeconds < 3600 && buyToSellRatio > 0.65) {
        strategy = 'ACCUMULATOR';
        confidence = volumeUsd24h > 10000 ? 'HIGH' : 'MEDIUM';
      } else if (volumeUsd24h > 100000 && buyToSellRatio < 0.25) {
        strategy = 'WHALE_DUMP';
        confidence = 'HIGH';
      } else {
        strategy = 'SWING';
        confidence = 'MEDIUM';
      }

      return { strategy, confidence, walletAddress: 'classified' };
    },
  }),

  // ── SWAP / EXECUTION ───────────────────────────────────────

  getJupiterQuote: tool({
    description: 'Get the best swap quote from Jupiter. Call this before any swap to show the user what they\'ll receive.',
    inputSchema: z.object({
      inputMint: z.string().describe('Input token mint (use So11111111111111111111111111111111111111112 for SOL)'),
      outputMint: z.string().describe('Output token mint address'),
      amountLamports: z.number().describe('Input amount in lamports/base units (e.g. 1 SOL = 1000000000)'),
      slippageBps: z.number().default(50).describe('Slippage tolerance in basis points (50 = 0.5%)'),
    }),
    execute: async ({ inputMint, outputMint, amountLamports, slippageBps }) => {
      return fetchJupiterQuote(inputMint, outputMint, amountLamports, slippageBps);
    },
  }),

  prepareSwap: tool({
    description: 'Prepare a Jupiter Ultra swap. Returns a swapPayload that the frontend wallet will sign and execute. Call getJupiterQuote first.',
    inputSchema: z.object({
      inputMint: z.string(),
      outputMint: z.string(),
      amountLamports: z.number(),
      slippageBps: z.number().default(50),
      walletPublicKey: z.string().describe('User\'s connected wallet public key'),
    }),
    execute: async ({ inputMint, outputMint, amountLamports, slippageBps, walletPublicKey }) => {
      // Returns unsigned order — the client component will handle signing with wallet adapter
      const res = await axios.get(`https://api.jup.ag/ultra/v1/order`, {
        params: {
          inputMint,
          outputMint,
          amount: amountLamports,
          slippageBps,
          taker: walletPublicKey,
        },
        headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {}
      });
      const order = res.data;
      return {
        swapReady: true,
        transaction: order.transaction, // base64 unsigned tx
        requestId: order.requestId,
        inAmount: order.inAmount,
        outAmount: order.outAmount,
        priceImpactPct: order.priceImpactPct,
      };
    },
  }),

  // ── AUTONOMOUS TRADING ────────────────────────────────────────

  scanMarketForOpportunities: tool({
    description: 'Autonomous market scanner - finds high-probability trading opportunities by scanning trending tokens, boosted tokens, and new listings. Returns tokens with confidence scores.',
    inputSchema: z.object({
      minConfidence: z.number().default(70).describe('Minimum confidence score to include'),
      minLiquidity: z.number().default(10000).describe('Minimum liquidity in USD'),
      minVolume24h: z.number().default(5000).describe('Minimum 24h volume in USD'),
      maxResults: z.number().default(10).describe('Maximum number of opportunities to return'),
    }),
    execute: async ({ minConfidence, minLiquidity, minVolume24h, maxResults }) => {
      console.log('[TOOL] scanMarketForOpportunities: scanning...');

      // Fetch from multiple sources in parallel
      const [trending, boosted, newListings] = await Promise.all([
        getDexTrendingTokens(50),
        getBoostedTokens(),
        fetchNewListings(20, true),
      ]);

      const opportunities: Array<{
        tokenAddress: string;
        symbol: string;
        name: string;
        price: number;
        priceChange24h: number;
        volume24h: number;
        liquidity: number;
        marketCap: number;
        confidence: number;
        source: string;
        reasons: string[];
      }> = [];

      // Process trending tokens
      for (const pair of trending) {
        if ((pair.liquidityUsd || 0) < minLiquidity) continue;
        if ((pair.volume?.h24 || 0) < minVolume24h) continue;

        const confidence = calculateConfidenceScore({
          liquidity: calculateLiquidityScore(pair.liquidityUsd || 0),
          volume: calculateVolumeScore(pair.volume?.h24 || 0, pair.fdv || pair.marketCap || 1),
          priceMomentum: calculateMomentumScore(pair.priceChange?.h24 || 0),
          smartMoney: 50, // Default until we analyze traders
          tokenomics: 50, // Default until we check security
          socialSentiment: 50,
        });

        if (confidence >= minConfidence) {
          opportunities.push({
            tokenAddress: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            price: parseFloat(pair.priceUsd) || 0,
            priceChange24h: pair.priceChange?.h24 || 0,
            volume24h: pair.volume?.h24 || 0,
            liquidity: pair.liquidityUsd || 0,
            marketCap: pair.marketCap || pair.fdv || 0,
            confidence,
            source: 'dexscreener',
            reasons: [
              `High liquidity: $${(pair.liquidityUsd || 0).toLocaleString()}`,
              `Strong volume: $${(pair.volume?.h24 || 0).toLocaleString()}/24h`,
              `Price momentum: ${pair.priceChange?.h24 || 0}%`,
            ],
          });
        }
      }

      // Process boosted tokens
      for (const boost of boosted.slice(0, 10)) {
        try {
          const info = await getTokenInfo(boost.tokenAddress, BIRDEYE_API_KEY);
          if (!info) continue;
          if (info.liquidity < minLiquidity) continue;
          if (info.volume24h < minVolume24h) continue;

          const confidence = calculateConfidenceScore({
            liquidity: calculateLiquidityScore(info.liquidity),
            volume: calculateVolumeScore(info.volume24h, info.marketCap),
            priceMomentum: calculateMomentumScore(info.priceChange24h),
            smartMoney: 60, // Boosted tokens often have marketing backing
            tokenomics: 50,
            socialSentiment: 70, // High social activity
          });

          if (confidence >= minConfidence) {
            opportunities.push({
              tokenAddress: info.address,
              symbol: info.symbol,
              name: info.name,
              price: info.price,
              priceChange24h: info.priceChange24h,
              volume24h: info.volume24h,
              liquidity: info.liquidity,
              marketCap: info.marketCap,
              confidence,
              source: 'boosted',
              reasons: [
                `DexScreener boosted (active marketing)`,
                `Liquidity: $${info.liquidity.toLocaleString()}`,
                `Volume: $${info.volume24h.toLocaleString()}/24h`,
              ],
            });
          }
        } catch (e) {
          console.error('[TOOL] Error processing boosted token:', boost.tokenAddress, e);
        }
      }

      // Process new listings
      const listings = (newListings as any)?.data?.items || [];
      for (const listing of listings.slice(0, 10)) {
        try {
          const info = await getTokenInfo(listing.address, BIRDEYE_API_KEY);
          if (!info) continue;
          if (info.liquidity < minLiquidity) continue;

          // New listings get a boost for being early opportunities
          const confidence = calculateConfidenceScore({
            liquidity: calculateLiquidityScore(info.liquidity),
            volume: calculateVolumeScore(info.volume24h, info.marketCap),
            priceMomentum: 60, // New listings often have momentum
            smartMoney: 50,
            tokenomics: 50,
            socialSentiment: 60, // New = attention
          });

          if (confidence >= minConfidence) {
            opportunities.push({
              tokenAddress: info.address,
              symbol: info.symbol,
              name: info.name,
              price: info.price,
              priceChange24h: info.priceChange24h,
              volume24h: info.volume24h,
              liquidity: info.liquidity,
              marketCap: info.marketCap,
              confidence,
              source: 'new_listing',
              reasons: [
                `Newly listed (early opportunity)`,
                `Liquidity: $${info.liquidity.toLocaleString()}`,
                `Initial volume: $${info.volume24h.toLocaleString()}`,
              ],
            });
          }
        } catch (e) {
          console.error('[TOOL] Error processing new listing:', listing.address, e);
        }
      }

      // Sort by confidence and return top results
      opportunities.sort((a, b) => b.confidence - a.confidence);
      const result = opportunities.slice(0, maxResults);

      console.log(`[TOOL] scanMarketForOpportunities: found ${result.length} opportunities`);
      return result;
    },
  }),

  analyzeToken: tool({
    description: 'Deep analysis of a single token - combines price, volume, holders, top traders, and security checks. Returns comprehensive analysis with buy/sell recommendation.',
    inputSchema: z.object({
      tokenAddress: z.string().describe('Token mint address'),
      includeTraders: z.boolean().default(true).describe('Whether to analyze top traders'),
      includeSecurity: z.boolean().default(true).describe('Whether to check security'),
    }),
    execute: async ({ tokenAddress, includeTraders, includeSecurity }) => {
      console.log('[TOOL] analyzeToken:', tokenAddress);

      // Fetch all data in parallel
      const [tokenInfo, pools, topTraders] = await Promise.all([
        getTokenInfo(tokenAddress, BIRDEYE_API_KEY),
        getTokenPairs(tokenAddress),
        includeTraders ? getTokenTopTraders(tokenAddress, 10, BIRDEYE_API_KEY) : Promise.resolve(null),
      ]);

      if (!tokenInfo) {
        return { error: 'Token not found or API error', tokenAddress };
      }

      // Calculate scores
      const liquidityScore = calculateLiquidityScore(tokenInfo.liquidity);
      const volumeScore = calculateVolumeScore(tokenInfo.volume24h, tokenInfo.marketCap);
      const momentumScore = calculateMomentumScore(tokenInfo.priceChange24h);

      // Analyze top traders if available
      let smartMoneyScore = 50;
      let traderAnalysis = null;
      if (topTraders && includeTraders) {
        const buyRatio = topTraders.reduce((sum, t) => sum + (t.buyRatio || 0.5), 0) / topTraders.length;
        const avgVolume = topTraders.reduce((sum, t) => sum + (t.volume || 0), 0) / topTraders.length;

        smartMoneyScore = buyRatio > 0.6 ? 70 : buyRatio > 0.5 ? 55 : 40;

        traderAnalysis = {
          topTradersCount: topTraders.length,
          avgBuyRatio: buyRatio,
          avgVolume: avgVolume,
          totalVolume24h: topTraders.reduce((sum, t) => sum + (t.volume || 0), 0),
          smartMoneySignal: buyRatio > 0.6 ? 'BULLISH' : buyRatio > 0.5 ? 'NEUTRAL' : 'BEARISH',
        };
      }

      // Security analysis
      let securityScore = 50;
      let securityAnalysis = null;
      if (includeSecurity) {
        const isRisky = tokenInfo.holderCount < 100 || // Very few holders
                        (tokenInfo.liquidity < 10000) || // Low liquidity
                        tokenInfo.marketCap < 50000; // Very low market cap

        securityScore = isRisky ? 30 : 60;
        securityAnalysis = {
          holderCount: tokenInfo.holderCount,
          liquidityRisk: tokenInfo.liquidity < 50000 ? 'HIGH' : 'MEDIUM',
          marketCapRisk: tokenInfo.marketCap < 100000 ? 'HIGH' : 'MEDIUM',
          overallRisk: isRisky ? 'HIGH' : 'MEDIUM',
        };
      }

      // Calculate overall confidence
      const confidence = calculateConfidenceScore({
        liquidity: liquidityScore,
        volume: volumeScore,
        priceMomentum: momentumScore,
        smartMoney: smartMoneyScore,
        tokenomics: securityScore,
        socialSentiment: 50,
      });

      // Generate recommendation
      let recommendation: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID' = 'WATCH';
      if (confidence >= 85 && liquidityScore >= 80 && volumeScore >= 70) {
        recommendation = 'STRONG_BUY';
      } else if (confidence >= 75 && liquidityScore >= 70) {
        recommendation = 'BUY';
      } else if (confidence >= 60) {
        recommendation = 'WATCH';
      } else {
        recommendation = 'AVOID';
      }

      const result = {
        tokenAddress,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        price: tokenInfo.price,
        priceChange24h: tokenInfo.priceChange24h,
        volume24h: tokenInfo.volume24h,
        marketCap: tokenInfo.marketCap,
        liquidity: tokenInfo.liquidity,
        holderCount: tokenInfo.holderCount,
        scores: {
          overall: confidence,
          liquidity: liquidityScore,
          volume: volumeScore,
          momentum: momentumScore,
          smartMoney: smartMoneyScore,
          security: securityScore,
        },
        traderAnalysis,
        securityAnalysis,
        recommendation,
        reasons: [
          `Liquidity: $${tokenInfo.liquidity.toLocaleString()} (score: ${liquidityScore})`,
          `Volume 24h: $${tokenInfo.volume24h.toLocaleString()} (score: ${volumeScore})`,
          `Price change: ${tokenInfo.priceChange24h}% (score: ${momentumScore})`,
          `Market cap: $${tokenInfo.marketCap.toLocaleString()}`,
        ],
      };

      console.log('[TOOL] analyzeToken complete:', recommendation, confidence);
      return result;
    },
  }),

  executeTrade: tool({
    description: 'Execute an autonomous trade - buys or sells a token using Jupiter. Only use when confidence is high (>80) and auto-trading is enabled.',
    inputSchema: z.object({
      tokenAddress: z.string().describe('Token mint address to trade'),
      side: z.enum(['buy', 'sell']).describe('Buy or sell'),
      amountUsd: z.number().describe('Amount in USD to trade'),
      slippageBps: z.number().default(50).describe('Slippage tolerance in basis points'),
      confidence: z.number().describe('Confidence score for this trade'),
      reason: z.string().describe('Reason for this trade'),
    }),
    execute: async ({ tokenAddress, side, amountUsd, slippageBps, confidence, reason }) => {
      console.log('[TOOL] executeTrade:', { side, tokenAddress, amountUsd, confidence });

      // Check if auto-trading is enabled
      if (!AUTO_TRADING_ENABLED) {
        return {
          executed: false,
          reason: 'Auto-trading is disabled. Set AUTO_TRADING_ENABLED=true to enable.',
          tradeData: null,
        };
      }

      // Validate confidence
      if (confidence < MIN_CONFIDENCE_SCORE) {
        return {
          executed: false,
          reason: `Confidence ${confidence} below minimum threshold ${MIN_CONFIDENCE_SCORE}`,
          tradeData: null,
        };
      }

      // Validate amount
      if (amountUsd > MAX_TRADE_AMOUNT_USD) {
        return {
          executed: false,
          reason: `Amount $${amountUsd} exceeds maximum $${MAX_TRADE_AMOUNT_USD}`,
          tradeData: null,
        };
      }

      try {
        // Get token price to calculate amount
        const priceData = await fetchJupiterPrices([tokenAddress]);
        if (!priceData || typeof priceData !== 'object') {
          return { executed: false, reason: 'Failed to get token price', tradeData: null };
        }

        // Get SOL price for swap
        const solMint = 'So11111111111111111111111111111111111111112';
        const solPriceData = await fetchJupiterPrices([solMint]);

        // For buy: SOL -> Token, For sell: Token -> SOL
        const inputMint = side === 'buy' ? solMint : tokenAddress;
        const outputMint = side === 'buy' ? tokenAddress : solMint;

        // Calculate amount in lamports (for SOL) or token base units
        // SOL has 9 decimals
        const solPrice = (solPriceData as any)?.[solMint]?.price || 150;
        const solAmount = amountUsd / solPrice;
        const amountLamports = Math.floor(solAmount * 1e9);

        console.log('[TOOL] Getting Jupiter quote:', { inputMint, outputMint, amountLamports });

        // Get quote
        const quote = await fetchJupiterQuote(inputMint, outputMint, amountLamports, slippageBps);
        if (!quote) {
          return { executed: false, reason: 'Failed to get quote from Jupiter', tradeData: null };
        }

        // Prepare the swap
        const swapPayload = {
          inputMint,
          outputMint,
          amount: amountLamports.toString(),
          slippageBps,
          quoteResponse: quote,
        };

        // Log the trade to database
        await ensureCollection(COLLECTIONS.TRADES);
        const tradeRecord = {
          _id: crypto.randomUUID(),
          token_address: tokenAddress,
          side,
          amount: amountUsd,
          price: (priceData as any)?.[tokenAddress]?.price || 0,
          total_value: amountUsd,
          slippage: slippageBps / 10000,
          status: 'pending',
          timestamp: new Date().toISOString(),
          confidence,
          reason,
          swapPayload,
        };

        await getDb().collection(COLLECTIONS.TRADES).insertOne(tradeRecord);

        console.log('[TOOL] executeTrade: Trade logged to database, awaiting execution');

        return {
          executed: true,
          status: 'pending_signature',
          reason: `Trade ${side} ${tokenAddress} for $${amountUsd} at confidence ${confidence}`,
          tradeData: {
            tradeId: tradeRecord._id,
            side,
            tokenAddress,
            amountUsd,
            inputMint,
            outputMint,
            amountLamports,
            slippageBps,
            swapPayload,
          },
        };
      } catch (error) {
        console.error('[TOOL] executeTrade error:', error);
        return {
          executed: false,
          reason: `Execution error: ${(error as Error).message}`,
          tradeData: null,
        };
      }
    },
  }),

  logTradeOutcome: tool({
    description: 'Log the outcome of a completed trade for RAG learning. Call this after a trade closes to improve future decisions.',
    inputSchema: z.object({
      tradeId: z.string().describe('Trade ID from executeTrade'),
      outcome: z.enum(['win', 'loss', 'breakeven']).describe('Trade outcome'),
      pnlUsd: z.number().describe('PnL in USD'),
      pnlPercentage: z.number().describe('PnL percentage'),
      exitReason: z.string().describe('Why the trade closed: TP hit, stop loss, manual, etc.'),
      lessons: z.string().describe('Key learnings from this trade'),
    }),
    execute: async ({ tradeId, outcome, pnlUsd, pnlPercentage, exitReason, lessons }) => {
      console.log('[TOOL] logTradeOutcome:', { tradeId, outcome, pnlPercentage });

      try {
        // Update trade record
        await ensureCollection(COLLECTIONS.TRADES);
        await getDb().collection(COLLECTIONS.TRADES).updateOne(
          { _id: tradeId },
          {
            $set: {
              status: outcome === 'breakeven' ? 'closed' : outcome === 'win' ? 'executed' : 'failed',
              pnl_usd: pnlUsd,
              pnl_percentage: pnlPercentage,
              exit_reason: exitReason,
              lessons,
              closed_at: new Date().toISOString(),
            },
          }
        );

        // Store in RAG memory for future learning
        await ensureCollection(COLLECTIONS.RAG_DOCUMENTS);
        const ragEntry = {
          _id: crypto.randomUUID(),
          content: `Trade outcome: ${outcome.toUpperCase()}. ${lessons}. Entry rationale: See trade ${tradeId}. Exit: ${exitReason}. PnL: ${pnlPercentage}%.`,
          metadata: {
            trade_id: tradeId,
            document_type: 'trade_outcome' as const,
            outcome: outcome === 'win' ? 'success' : outcome === 'loss' ? 'failure' : 'neutral',
            pnl: pnlUsd,
            pnl_percentage: pnlPercentage,
            timestamp: new Date().toISOString(),
          },
        };

        await getDb().collection(COLLECTIONS.RAG_DOCUMENTS).insertOne(ragEntry);

        console.log('[TOOL] logTradeOutcome: Logged to DB and RAG');

        return {
          success: true,
          tradeId,
          outcome,
          pnlPercentage,
          message: `Trade ${outcome} (+${pnlPercentage}%) logged for learning`,
        };
      } catch (error) {
        console.error('[TOOL] logTradeOutcome error:', error);
        return {
          success: false,
          reason: (error as Error).message,
        };
      }
    },
  }),
});
