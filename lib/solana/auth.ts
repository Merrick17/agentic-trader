import { getDb } from '@/lib/astra/client';
import { COLLECTIONS, ensureCollection, type SessionDocument, type UserDocument } from '@/lib/astra/collections';

const AUTH_TOKEN_COOKIE = 'matrix_session';

export interface AuthSession {
  walletAddress: string;
  publicKey: string;
  acceptedDisclaimer: boolean;
  acceptedAt?: string;
}

export function createSignMessage(walletAddress: string, nonce: string): string {
  return `MATRIX_TRADER_AUTHENTICATION

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${Date.now()}

Sign this message to authenticate with Matrix Trader.
This will not trigger any blockchain transaction.

By signing, you acknowledge that:
- Trading cryptocurrencies involves substantial risk
- You may lose all funds deployed by the agent
- Past performance does not guarantee future results
- You are solely responsible for your trading decisions`;
}

export async function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    // Dynamic import to avoid SSR issues
    const { PublicKey } = await import('@solana/web3.js');
    const { sign } = await import('tweetnacl');

    const pubKey = new PublicKey(publicKey);
    const messageBytes = new TextEncoder().encode(message);
    // Signature comes as base64 string, decode to Uint8Array
    const signatureBytes = new Uint8Array(Buffer.from(signature, 'base64'));

    // Use nacl for signature verification
    const nacl = (await import('tweetnacl')).default;
    return nacl.sign.detached.verify(messageBytes, signatureBytes, pubKey.toBytes());
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

export async function createSession(walletAddress: string): Promise<string> {
  const sessionId = crypto.randomUUID();

  // Ensure collection exists before using
  await ensureCollection(COLLECTIONS.SESSIONS);

  const db = getDb();
  await db.collection<SessionDocument>(COLLECTIONS.SESSIONS).insertOne({
    _id: sessionId,
    walletAddress,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  });

  return sessionId;
}

export async function getSession(sessionId: string): Promise<AuthSession | null> {
  try {
    const db = getDb();

    // Try to get session, return null if collection doesn't exist
    let session = null;
    try {
      session = await db.collection<SessionDocument>(COLLECTIONS.SESSIONS).findOne({
        _id: sessionId,
      });
    } catch (e) {
      // Collection doesn't exist yet - no session
      return null;
    }

    if (!session || new Date(session.expiresAt) < new Date()) {
      return null;
    }

    // Try to get user data
    let user = null;
    try {
      user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
        walletAddress: session.walletAddress,
      });
    } catch (e) {
      // Users collection doesn't exist
    }

    return {
      walletAddress: session.walletAddress,
      publicKey: session.walletAddress,
      acceptedDisclaimer: user?.acceptedDisclaimer || false,
      acceptedAt: user?.acceptedAt,
    };
  } catch (error) {
    console.error('Session retrieval failed:', error);
    return null;
  }
}

export async function storeUser(
  walletAddress: string,
  acceptedDisclaimer: boolean
): Promise<void> {
  // Ensure collection exists before using
  await ensureCollection(COLLECTIONS.USERS);

  const db = getDb();
  const now = new Date().toISOString();

  await db.collection<UserDocument>(COLLECTIONS.USERS).updateOne(
    { walletAddress },
    {
      $set: {
        walletAddress,
        acceptedDisclaimer,
        acceptedAt: acceptedDisclaimer ? now : undefined,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
}

export function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}
