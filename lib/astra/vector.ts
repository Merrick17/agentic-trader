import { getDb } from './client';
import { COLLECTIONS } from './collections';
import type { RAGDocument } from './collections';

// Vector dimension for embeddings
export const VECTOR_DIMENSION = 1536;

// Find similar documents using vector search
export async function findSimilarDocuments(
  queryVector: number[],
  filters?: { tokenAddress?: string; documentType?: string; minTimestamp?: Date; userId?: string },
  limit = 10
): Promise<Array<RAGDocument & { similarity?: number }>> {
  const db = getDb();
  const collection = db.collection(COLLECTIONS.RAG_VECTORS);

  const filter: Record<string, unknown> = {};

  if (filters?.tokenAddress) {
    filter['metadata.token_address'] = filters.tokenAddress;
  }

  if (filters?.documentType) {
    filter['metadata.document_type'] = filters.documentType;
  }

  if (filters?.minTimestamp) {
    filter['metadata.timestamp'] = { $gte: filters.minTimestamp };
  }

  if (filters?.userId) {
    filter['metadata.user_id'] = filters.userId;
  }

  // Use find with vector sort - returns cursor
  const cursor = collection.find(filter, {
    sort: { $vector: queryVector },
    includeSimilarity: true,
  }).limit(limit);

  const documents = await cursor.toArray();

  return documents.map((doc: Record<string, unknown>) => ({
    id: doc.id as string,
    content: doc.content as string,
    metadata: {
      token_address: (doc.metadata as Record<string, unknown>)?.token_address as string | undefined,
      trade_id: (doc.metadata as Record<string, unknown>)?.trade_id as string | undefined,
      signal_id: (doc.metadata as Record<string, unknown>)?.signal_id as string | undefined,
      document_type: (doc.metadata as Record<string, unknown>)?.document_type as RAGDocument['metadata']['document_type'],
      timestamp: new Date((doc.metadata as Record<string, unknown>)?.timestamp as string),
      outcome: (doc.metadata as Record<string, unknown>)?.outcome as 'success' | 'failure' | 'neutral' | undefined,
      pnl: (doc.metadata as Record<string, unknown>)?.pnl as number | undefined,
    },
    vector: doc.vector as number[] | undefined,
    similarity: doc.$similarity as number | undefined,
  }));
}

// Insert a document with its vector embedding
export async function insertRAGDocument(document: RAGDocument & { userId?: string }): Promise<void> {
  const db = getDb();
  const collection = db.collection(COLLECTIONS.RAG_VECTORS);

  await collection.insertOne({
    id: document.id,
    content: document.content,
    metadata: {
      ...document.metadata,
      user_id: document.userId,
    },
    vector: document.vector,
  });
}

// Generate a simple embedding (placeholder - replace with actual embedding model)
export async function generateEmbedding(text: string): Promise<number[]> {
  // This is a placeholder. In production, use an actual embedding model
  // like OpenAI's text-embedding-3-small or similar

  // For now, return a random vector of the correct dimension
  // This should be replaced with a real embedding service
  const embedding = Array.from({ length: VECTOR_DIMENSION }, () =>
    (Math.random() - 0.5) * 2
  );

  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Get documents by trade outcome for learning
export async function getDocumentsByOutcome(
  outcome: 'success' | 'failure' | 'neutral',
  userId?: string,
  limit = 50
): Promise<RAGDocument[]> {
  const db = getDb();
  const collection = db.collection(COLLECTIONS.RAG_VECTORS);

  const filter: Record<string, unknown> = {
    'metadata.outcome': outcome,
  };

  if (userId) {
    filter['metadata.user_id'] = userId;
  }

  const cursor = collection.find(filter).sort({ 'metadata.timestamp': -1 }).limit(limit);

  const documents = await cursor.toArray();

  return documents.map((doc: Record<string, unknown>) => ({
    id: doc.id as string,
    content: doc.content as string,
    metadata: {
      token_address: (doc.metadata as Record<string, unknown>)?.token_address as string | undefined,
      trade_id: (doc.metadata as Record<string, unknown>)?.trade_id as string | undefined,
      signal_id: (doc.metadata as Record<string, unknown>)?.signal_id as string | undefined,
      document_type: (doc.metadata as Record<string, unknown>)?.document_type as RAGDocument['metadata']['document_type'],
      timestamp: new Date((doc.metadata as Record<string, unknown>)?.timestamp as string),
      outcome: (doc.metadata as Record<string, unknown>)?.outcome as 'success' | 'failure' | 'neutral' | undefined,
      pnl: (doc.metadata as Record<string, unknown>)?.pnl as number | undefined,
    },
    vector: doc.vector as number[] | undefined,
  }));
}

// Store trade outcome for RAG learning
export async function storeTradeOutcome(params: {
  tradeId: string;
  signalId?: string;
  tokenAddress: string;
  tokenSymbol?: string;
  content: string;
  outcome: 'success' | 'failure' | 'neutral';
  pnl?: number;
  pnlPercentage?: number;
  userId?: string;
}): Promise<void> {
  const embedding = await generateEmbedding(params.content);

  const document: RAGDocument = {
    id: `trade_outcome_${params.tradeId}`,
    content: params.content,
    metadata: {
      trade_id: params.tradeId,
      signal_id: params.signalId,
      token_address: params.tokenAddress,
      token_symbol: params.tokenSymbol,
      document_type: 'trade_outcome',
      timestamp: new Date(),
      outcome: params.outcome,
      pnl: params.pnl,
      pnl_percentage: params.pnlPercentage,
    },
    vector: embedding,
  };

  await insertRAGDocument({ ...document, userId: params.userId });
}
