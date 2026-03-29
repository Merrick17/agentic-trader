import { Connection, PublicKey, Commitment } from '@solana/web3.js';

// Solana RPC endpoints
const RPC_ENDPOINTS = {
  mainnet: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  helius: process.env.HELIUS_RPC_URL,
};

// Connection singleton
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    const endpoint = RPC_ENDPOINTS.helius || RPC_ENDPOINTS.mainnet;
    const commitment: Commitment = 'confirmed';

    connection = new Connection(endpoint, {
      commitment,
      wsEndpoint: undefined, // WebSocket is handled separately
    });
  }
  return connection;
}

// Get token account balance
export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string
): Promise<{ balance: number; decimals: number } | null> {
  try {
    const connection = getConnection();
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMint);

    // Get associated token account
    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const tokenAccount = await getAssociatedTokenAddress(mint, wallet);

    try {
      const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
      return {
        balance: parseFloat(accountInfo.value.amount) / Math.pow(10, accountInfo.value.decimals),
        decimals: accountInfo.value.decimals,
      };
    } catch {
      // Account doesn't exist
      return { balance: 0, decimals: 0 };
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
    return null;
  }
}

// Get SOL balance
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const connection = getConnection();
    const wallet = new PublicKey(walletAddress);
    const balance = await connection.getBalance(wallet);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
}

// Get token metadata
export async function getTokenMetadata(mintAddress: string): Promise<{
  symbol: string;
  name: string;
  decimals: number;
} | null> {
  try {
    // Use Metaplex metadata or a token list
    const response = await fetch(
      `https://api.solana.fm/v1/tokens/${mintAddress}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      symbol: (data.token?.symbol as string) || 'UNKNOWN',
      name: (data.tokenName as string) || 'Unknown Token',
      decimals: data.decimals || 9,
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

// Check transaction status
export async function checkTransactionStatus(signature: string): Promise<{
  status: 'confirmed' | 'failed' | 'pending' | 'not_found';
  slot?: number;
  err?: unknown;
}> {
  try {
    const connection = getConnection();
    const status = await connection.getSignatureStatus(signature);

    if (!status?.value) {
      return { status: 'not_found' };
    }

    if (status.value.err) {
      return { status: 'failed', err: status.value.err };
    }

    if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
      return { status: 'confirmed', slot: status.value.slot };
    }

    return { status: 'pending' };
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return { status: 'not_found' };
  }
}

// Get recent transactions for a wallet
export async function getRecentTransactions(
  walletAddress: string,
  limit: number = 20
): Promise<Array<{
  signature: string;
  timestamp: number;
  status: 'success' | 'failed';
  type: string;
}>> {
  try {
    const connection = getConnection();
    const wallet = new PublicKey(walletAddress);

    const signatures = await connection.getSignaturesForAddress(wallet, { limit });

    return signatures.map((sig) => ({
      signature: sig.signature,
      timestamp: (sig.blockTime || 0) * 1000,
      status: sig.err ? 'failed' : 'success',
      type: sig.memo || 'transfer',
    }));
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }
}
