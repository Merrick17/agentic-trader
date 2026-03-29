/**
 * Jupiter API wrapper
 * Handles swap quotes, price data, and transaction building
 * Uses Jupiter API V6 (legacy) and Ultra V1 for swaps
 */

import axios from 'axios';

const JUPITER_API_BASE = 'https://api.jup.ag';
const JUPITER_ULTRA_API = 'https://api.jup.ag/ultra/v1';
const JUPITER_V6_API = 'https://quote-api.jup.ag/v6';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | unknown;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface SwapTransaction {
  transaction: string; // base64 encoded transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export interface TokenPrice {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

export interface JupiterPriceResponse {
  data: Record<string, TokenPrice>;
  timeTaken: number;
}

/**
 * Get swap quote from Jupiter V6
 * Note: V6 is legacy but still functional
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps = 50,
  apiKey?: string
): Promise<JupiterQuote | null> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await axios.get(
      `${JUPITER_V6_API}/quote`,
      {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps,
          restrictIntermediateTokens: true,
        },
        headers,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching Jupiter quote:', error);
    return null;
  }
}

/**
 * Build swap transaction from quote
 */
export async function getSwapTransaction(
  quoteResponse: JupiterQuote,
  userPublicKey: string,
  apiKey?: string
): Promise<SwapTransaction | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await axios.post(
      `${JUPITER_V6_API}/swap`,
      {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 10000000,
            priorityLevel: 'very_high',
          },
        },
      },
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error('Error building swap transaction:', error);
    return null;
  }
}

/**
 * Get token prices from Jupiter Price V3
 */
export async function getTokenPrices(
  mints: string[],
  apiKey?: string
): Promise<Record<string, TokenPrice> | null> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const ids = mints.join(',');
    const response = await axios.get(
      `${JUPITER_API_BASE}/price/v3`,
      {
        params: { ids },
        headers
      }
    );

    const data: JupiterPriceResponse = response.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return null;
  }
}

/**
 * Get trending tokens from Jupiter
 */
export async function getTrendingTokens(
  interval: '5m' | '15m' | '30m' | '1h' | '4h' | '24h' = '24h',
  limit = 20,
  apiKey?: string
): Promise<unknown[] | null> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await axios.get(
      `${JUPITER_API_BASE}/tokens/v2/toptrending/${interval}`,
      {
        params: { limit },
        headers
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching trending tokens:', error);
    return null;
  }
}

/**
 * Get Ultra order (simpler swap endpoint)
 */
export async function getUltraOrder(
  inputMint: string,
  outputMint: string,
  amount: string,
  taker: string,
  slippageBps = 50,
  apiKey?: string
): Promise<unknown | null> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await axios.get(
      `${JUPITER_ULTRA_API}/order`,
      {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps,
          taker,
        },
        headers
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching Ultra order:', error);
    return null;
  }
}

/**
 * Get Jupiter verified token list
 */
export async function getTokenList(apiKey?: string): Promise<unknown[] | null> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await axios.get(
      `${JUPITER_API_BASE}/tokens/v1/tagged/verified`,
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching token list:', error);
    return null;
  }
}
