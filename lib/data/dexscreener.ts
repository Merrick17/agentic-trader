import type { Signal } from '@/types/signal';
import axios from 'axios';

const DEXSCREENER_API_BASE = 'https://api.dexscreener.com';

// Shared axios client – adds User-Agent so the API doesn't reject headless Node requests
const dexClient = axios.create({
  baseURL: DEXSCREENER_API_BASE,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; AgenticTrader/1.0)',
  },
  timeout: 12000,
});

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: { h24: number; h6: number; h1: number; m5: number };
  priceChange: { h24: number; h6: number; h1: number; m5: number };
  liquidityUsd: number;
  fdv: number;
  marketCap: number;
}

export interface TokenProfile {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: { label: string; url: string; type: string }[];
}

export interface TokenBoost {
  url: string;
  chainId: string;
  tokenAddress: string;
  amount: number;
  totalAmount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isSolana(item: { chainId: string }) {
  return item.chainId === 'solana';
}

/** Batch-resolve pair data for up to 30 token addresses at once */
async function resolvePairs(addresses: string[]): Promise<DexScreenerPair[]> {
  if (!addresses.length) return [];

  // DexScreener allows comma-separated addresses (max 30 per call)
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await dexClient.get(
          `/tokens/v1/solana/${chunk.join(',')}`,
          { validateStatus: () => true }
        );

        if (res.status === 429) {
          console.warn('[DexScreener] Rate limited on /tokens/v1');
          return [] as DexScreenerPair[];
        }
        if (res.status !== 200) return [] as DexScreenerPair[];

        // Returns an array of pairs
        return (Array.isArray(res.data) ? res.data : []) as DexScreenerPair[];
      } catch (e) {
        console.error('[DexScreener] resolvePairs error:', e);
        return [] as DexScreenerPair[];
      }
    })
  );

  return results.flat();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the latest token profiles from DexScreener.
 * Returns array directly from the API (no hardcoded lists).
 */
export async function getTokenProfiles(): Promise<TokenProfile[]> {
  try {
    const res = await dexClient.get('/token-profiles/latest/v1', {
      validateStatus: () => true,
    });
    if (res.status === 429) { console.warn('[DexScreener] Rate limited: /token-profiles/latest/v1'); return []; }
    const data: TokenProfile[] = Array.isArray(res.data) ? res.data : [];
    console.log(`[DexScreener] getTokenProfiles: ${data.length} profiles`);
    return data;
  } catch (e) {
    console.error('[DexScreener] getTokenProfiles error:', e);
    return [];
  }
}

/**
 * Get the top boosted tokens from DexScreener.
 * Returns array directly from the API (no hardcoded lists).
 */
export async function getBoostedTokens(): Promise<TokenBoost[]> {
  try {
    const res = await dexClient.get('/token-boosts/top/v1', {
      validateStatus: () => true,
    });
    if (res.status === 429) { console.warn('[DexScreener] Rate limited: /token-boosts/top/v1'); return []; }
    const data: TokenBoost[] = Array.isArray(res.data) ? res.data : [];
    console.log(`[DexScreener] getBoostedTokens: ${data.length} boosts`);
    return data;
  } catch (e) {
    console.error('[DexScreener] getBoostedTokens error:', e);
    return [];
  }
}

/**
 * Discover trending Solana pairs organically:
 *  1. Fetch top-boosted tokens  (active marketing / pumped tokens)
 *  2. Fetch latest token profiles (newly listed tokens)
 *  3. Batch-resolve live pair data for all discovered addresses
 *  4. Filter for quality (volume + liquidity), deduplicate, sort, slice
 *
 * No hardcoded token lists – fully market-driven.
 */
export async function getTrendingTokens(limit = 20): Promise<DexScreenerPair[]> {
  try {
    // Step 1: Discover token addresses from DexScreener's live feeds
    const [boostedRaw, profilesRaw] = await Promise.all([
      getBoostedTokens(),
      getTokenProfiles(),
    ]);

    const boostedSolana = boostedRaw.filter(isSolana);
    const profilesSolana = profilesRaw.filter(isSolana);

    // Build a deduplicated list of token addresses
    const addressSet = new Set<string>();
    for (const t of boostedSolana) addressSet.add(t.tokenAddress);
    for (const p of profilesSolana) addressSet.add(p.tokenAddress);

    const addresses = Array.from(addressSet);
    console.log(`[DexScreener] getTrendingTokens: resolving ${addresses.length} discovered addresses`);

    let pairs: DexScreenerPair[] = [];

    if (addresses.length > 0) {
      // Step 2: Batch-resolve live pair data
      pairs = await resolvePairs(addresses);
    }

    // Step 3: Filter for quality Solana pairs
    let qualified = pairs.filter(
      (p) =>
        p.chainId === 'solana' &&
        parseFloat(p.priceUsd || '0') > 0 &&
        (p.volume?.h24 || 0) > 5000 &&    // min $5k daily volume
        (p.liquidityUsd || 0) > 1000       // min $1k liquidity
    );

    // Step 4: If still empty, fall back to search-based discovery
    if (qualified.length === 0) {
      console.warn('[DexScreener] No pairs from boosted/profiles feed — trying search fallback');
      const fallbackQueries = ['SOL', 'BONK', 'JUP', 'WIF', 'POPCAT', 'BOME', 'MEW'];
      const searchResults = await Promise.all(
        fallbackQueries.map(async (q) => {
          try {
            const res = await dexClient.get('/latest/dex/search', {
              params: { q },
              validateStatus: () => true,
            });
            if (res.status !== 200) return [] as DexScreenerPair[];
            const data = res.data;
            const rawPairs: DexScreenerPair[] = Array.isArray(data) ? data : (data?.pairs || []);
            const solanaPairs = rawPairs.filter(
              (p) =>
                p.chainId === 'solana' &&
                parseFloat(p.priceUsd || '0') > 0 &&
                (p.volume?.h24 || 0) > 1000
            );
            console.log(`[DexScreener] "${q}": ${solanaPairs.length} qualifying Solana pairs`);
            return solanaPairs;
          } catch {
            return [] as DexScreenerPair[];
          }
        })
      );
      qualified = searchResults.flat();
    }

    // Step 5: Deduplicate by pair address, sort by 24h volume
    const unique = qualified.filter(
      (pair, i, self) => i === self.findIndex((p) => p.pairAddress === pair.pairAddress)
    );
    unique.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

    const result = unique.slice(0, limit);
    console.log(`[DexScreener] getTrendingTokens: returning ${result.length} unique pairs`);
    return result;
  } catch (e) {
    console.error('[DexScreener] getTrendingTokens error:', e);
    return [];
  }
}

/**
 * Fetch all pairs for a specific token address.
 */
export async function getTokenPairs(tokenAddress: string): Promise<DexScreenerPair[]> {
  try {
    const res = await dexClient.get(`/token-pairs/v1/solana/${tokenAddress}`, {
      validateStatus: () => true,
    });
    if (res.status !== 200) return [];
    const pairs: DexScreenerPair[] = Array.isArray(res.data) ? res.data : (res.data?.pairs || []);
    console.log(`[DexScreener] getTokenPairs(${tokenAddress}): ${pairs.length} pairs`);
    return pairs;
  } catch (e) {
    console.error('[DexScreener] getTokenPairs error:', e);
    return [];
  }
}

/**
 * Search for pairs by a free-text query (agent-driven, caller supplies the query).
 * No hardcoded queries here — the agent decides what to search for.
 */
export async function searchTokens(query: string): Promise<DexScreenerPair[]> {
  try {
    const res = await dexClient.get('/latest/dex/search', {
      params: { q: query },
      validateStatus: () => true,
    });
    if (res.status === 429) { console.warn(`[DexScreener] Rate limited: search "${query}"`); return []; }
    if (res.status !== 200) return [];
    const pairs: DexScreenerPair[] = Array.isArray(res.data) ? res.data : (res.data?.pairs || []);
    console.log(`[DexScreener] searchTokens("${query}"): ${pairs.length} total, filtering Solana...`);
    return pairs.filter((p) => p.chainId === 'solana' && p.volume?.h24);
  } catch (e) {
    console.error('[DexScreener] searchTokens error:', e);
    return [];
  }
}

// ─── Signal Conversion ───────────────────────────────────────────────────────

/**
 * Convert DexScreener pair data to Signal format
 */
export function convertToSignal(pair: DexScreenerPair, confidence: number): Signal {
  return {
    id: `dex_${pair.pairAddress}`,
    tokenAddress: pair.baseToken.address,
    tokenSymbol: pair.baseToken.symbol,
    tokenName: pair.baseToken.name,
    price: parseFloat(pair.priceUsd) || 0,
    priceChange24h: pair.priceChange?.h24 || 0,
    volume24h: pair.volume?.h24 || 0,
    marketCap: pair.marketCap || pair.fdv || 0,
    liquidity: pair.liquidityUsd || 0,
    confidence,
    sentiment:
      pair.priceChange?.h24 > 5 ? 'bullish' :
      pair.priceChange?.h24 < -5 ? 'bearish' : 'neutral',
    source: 'dexscreener',
    timestamp: new Date(),
    metadata: {
      pairAddress: pair.pairAddress,
      txns24h: pair.txns?.h24,
    },
    status: 'active',
  };
}
