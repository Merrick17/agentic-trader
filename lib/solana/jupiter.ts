import { PublicKey, Transaction } from '@solana/web3.js';
import axios from 'axios';
import { getConnection } from './connection';

// Jupiter API base URLs
const JUPITER_API_V2 = 'https://api.jup.ag/swap/v2';
const JUPITER_PRICE_V3 = 'https://api.jup.ag/price/v3';

// Default dummy taker needed to simulate a quote if not executing
const DUMMY_TAKER = '11111111111111111111111111111111';

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  routePlan?: unknown[];
  // For V2 /order
  swapTransaction?: string;
  requestId?: string;
}

export interface SwapTransaction {
  swapTransaction: string;
  requestId?: string;
}

// Get swap quote (and assembled transaction) from Jupiter Swap API V2 /order
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50,
  taker: string = DUMMY_TAKER
): Promise<SwapQuote | null> {
  try {
    // Check if using native SOL (wrap it)
    const inputToken = inputMint === 'SOL' ? 'So11111111111111111111111111111111111111112' : inputMint;
    const outputToken = outputMint === 'SOL' ? 'So11111111111111111111111111111111111111112' : outputMint;

    const url = `${JUPITER_API_V2}/order?inputMint=${inputToken}&outputMint=${outputToken}&amount=${amount}&slippageBps=${slippageBps}&taker=${taker}`;

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
      },
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      throw new Error(`Jupiter V2 order error: ${JSON.stringify(response.data)}`);
    }

    const data = response.data;
    console.log('[AXIOS] Jupiter V2 swap order:', { outAmount: data.outAmount, hasTransaction: !!data.swapTransaction });
    return data;
  } catch (error) {
    console.error('Error getting swap quote/order:', error);
    return null;
  }
}

// Get swap transaction from Jupiter 
// In V2, getSwapQuote (/order) already returns the assembled transaction,
// so this function is just a backward-compatibility wrapper or identity function.
export async function getSwapTransaction(
  quoteResponse: SwapQuote,
  userPublicKey: string
): Promise<SwapTransaction | null> {
  if (quoteResponse.swapTransaction) {
    return {
      swapTransaction: quoteResponse.swapTransaction,
      requestId: quoteResponse.requestId,
    };
  }
  return null;
}

// Execute trade (server-side)
export async function executeTrade(params: {
  walletAddress: string;
  inputToken: string;
  outputToken: string;
  amount: number;
  slippageBps: number;
}): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
  quote?: SwapQuote;
}> {
  try {
    // Get quote and transaction in one /order call
    const quote = await getSwapQuote(
      params.inputToken,
      params.outputToken,
      params.amount,
      params.slippageBps,
      params.walletAddress
    );

    if (!quote || !quote.swapTransaction) {
      return { success: false, error: 'Failed to get swap quote/transaction from Jupiter V2' };
    }

    return {
      success: true,
      signature: undefined, // Will be filled after client signs via signAndSendTransaction
      quote,
    };
  } catch (error) {
    console.error('Trade execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Client-side: Sign and send transaction
export async function signAndSendTransaction(
  serializedTransaction: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  requestId?: string
): Promise<{ signature: string; status: 'confirmed' | 'failed' }> {
  try {
    const connection = getConnection();

    // Deserialize transaction
    const txBuffer = Buffer.from(serializedTransaction, 'base64');
    const transaction = Transaction.from(txBuffer);

    // Sign transaction
    const signedTx = await signTransaction(transaction);

    // Native Jupiter execution via api.jup.ag/swap/v2/execute
    if (requestId) {
      console.log('[AXIOS] Submitting signed transaction to Jupiter V2 /execute endpoint for managed landing');
      const executeRes = await axios.post(`${JUPITER_API_V2}/execute`, {
        signedTransaction: signedTx.serialize().toString('base64'),
        requestId
      }, { validateStatus: () => true });

      if (executeRes.status === 200 && executeRes.data?.signature) {
         return { signature: executeRes.data.signature, status: 'confirmed' };
      } else {
         console.warn('[AXIOS] Jupiter /execute returned non-200. Fallback to local sendRawTransaction.');
         // We can fallback, but let's log the error
         console.error('Jupiter execute endpoint error:', executeRes.data);
      }
    }

    // Fallback: Send transaction manually via web3.js
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      return { signature, status: 'failed' };
    }

    return { signature, status: 'confirmed' };
  } catch (error) {
    console.error('Sign and send error:', error);
    throw error;
  }
}

// Get token price from Jupiter V3 API directly
export async function getTokenPrice(tokenMint: string): Promise<number | null> {
  try {
    // Check if using native SOL (wrap it)
    const mint = tokenMint === 'SOL' ? 'So11111111111111111111111111111111111111112' : tokenMint;

    const response = await axios.get(`${JUPITER_PRICE_V3}?ids=${mint}`, {
      validateStatus: () => true,
    });

    if (response.status === 200 && response.data?.data?.[mint]?.price) {
      return parseFloat(response.data.data[mint].price);
    }

    return null;
  } catch (error) {
    console.error('Error getting token price:', error);
    return null;
  }
}

// Get Jupiter quote (alias for getSwapQuote)
export async function getJupiterQuote(
  inputToken: string,
  outputToken: string,
  amount: number,
  slippageBps: number = 50
): Promise<SwapQuote | null> {
  return getSwapQuote(inputToken, outputToken, amount, slippageBps);
}

// Execute Jupiter swap (alias for executeTrade with proper params)
export async function executeJupiterSwap(params: {
  walletAddress: string;
  inputToken: string;
  outputToken: string;
  amount: number;
  slippageBps: number;
}): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
}> {
  const result = await executeTrade(params);
  return {
    success: result.success,
    signature: result.signature,
    error: result.error,
  };
}

// Route type definition
interface SwapRouteInfo {
  routes: Array<{
    percent: number;
    swaps: Array<{
      dex: string;
      from: string;
      to: string;
      amount: number;
    }>;
  }> | null;
}

// Get route for multi-hop swaps
export async function getSwapRoute(
  inputMint: string,
  outputMint: string,
  amount: number
): Promise<SwapRouteInfo> {
  try {
    const quote = await getSwapQuote(inputMint, outputMint, amount);

    if (!quote) return { routes: null };

    // Parse route information
    // This is a simplified version - the actual route structure is more complex
    return {
      routes: [{
        percent: 100,
        swaps: [{
          dex: 'Jupiter Aggregator',
          from: inputMint.slice(0, 4) + '...',
          to: outputMint.slice(0, 4) + '...',
          amount: amount,
        }],
      }],
    };
  } catch (error) {
    console.error('Error getting swap route:', error);
    return { routes: null };
  }
}
