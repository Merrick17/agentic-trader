// Astra DB collection names
export const COLLECTIONS = {
  // Auth collections
  USERS: 'users',
  SESSIONS: 'sessions',
  // Trading collections
  SIGNALS: 'signals',
  TRADES: 'trades',
  PORTFOLIO: 'portfolio',
  PORTFOLIO_HISTORY: 'portfolio_history',
  AGENT_LOGS: 'agent_logs',
  RAG_DOCUMENTS: 'rag_documents',
  RAG_VECTORS: 'rag_vectors',
  // Settings collection
  USER_SETTINGS: 'user_settings',
} as const;

// Collection types for type safety
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// Collection schemas (for reference)
export interface SignalDocument {
  id: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  liquidity: number;
  confidence: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  source: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  status: 'active' | 'expired' | 'triggered';
}

export interface TradeDocument {
  id: string;
  signal_id?: string;
  token_address: string;
  token_symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  total_value: number;
  slippage: number;
  fee: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  tx_hash?: string;
  timestamp: Date;
  executed_at?: Date;
  failed_at?: Date;
  error_message?: string;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    token_address?: string;
    token_symbol?: string;
    trade_id?: string;
    signal_id?: string;
    document_type: 'trade_outcome' | 'market_analysis' | 'agent_reasoning';
    timestamp: Date;
    outcome?: 'success' | 'failure' | 'neutral';
    pnl?: number;
    pnl_percentage?: number;
  };
  vector?: number[];
}

// Auth collection types
export interface UserDocument {
  _id: string;
  walletAddress: string;
  acceptedDisclaimer: boolean;
  acceptedAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface SessionDocument {
  _id: string;
  walletAddress: string;
  createdAt: string;
  expiresAt: string;
}

// Collection initialization - ensures all collections exist
import { getDb } from './client';
import type { Db } from '@datastax/astra-db-ts';

const REQUIRED_COLLECTIONS = [
  COLLECTIONS.USERS,
  COLLECTIONS.SESSIONS,
  COLLECTIONS.SIGNALS,
  COLLECTIONS.TRADES,
  COLLECTIONS.PORTFOLIO,
  COLLECTIONS.PORTFOLIO_HISTORY,
];

/**
 * Initialize all required collections in AstraDB
 * Call this on app startup or before using collections
 */
export async function initializeCollections(): Promise<void> {
  const db = getDb();

  try {
    // Get existing collections
    const existingCollections = await db.listCollections();
    const existingNames = new Set(existingCollections.map(c => c.name));

    // Create missing collections
    for (const collectionName of REQUIRED_COLLECTIONS) {
      if (!existingNames.has(collectionName)) {
        console.log(`Creating collection: ${collectionName}`);
        await db.createCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
      }
    }

    console.log('All collections initialized');
  } catch (error) {
    console.error('Failed to initialize collections:', error);
    throw error;
  }
}

/**
 * Ensure a collection exists before using it
 * Safe to call multiple times - will only create if missing
 */
export async function ensureCollection(collectionName: string): Promise<void> {
  const db = getDb();

  try {
    const existingCollections = await db.listCollections();
    const exists = existingCollections.some(c => c.name === collectionName);

    if (!exists) {
      console.log(`Creating missing collection: ${collectionName}`);
      await db.createCollection(collectionName);
    }
  } catch (error) {
    console.error(`Failed to ensure collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get a collection with auto-creation if it doesn't exist
 */
export async function getCollection<T extends { _id: string }>(
  collectionName: string,
  autoCreate: boolean = true
) {
  const db = getDb();

  if (autoCreate) {
    await ensureCollection(collectionName);
  }

  return db.collection<T>(collectionName);
}
