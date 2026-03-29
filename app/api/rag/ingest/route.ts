import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { insertRAGDocument, generateEmbedding } from '@/lib/astra/vector';
import type { RAGDocument } from '@/lib/astra/collections';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('matrix_session')?.value;

    if (!sessionId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { content, metadata } = await req.json();

    if (!content) {
      return new Response('Content is required', { status: 400 });
    }

    // Generate embedding
    const embedding = await generateEmbedding(content);

    // Create document
    const document: RAGDocument = {
      id: `doc_${Date.now()}`,
      content,
      metadata: {
        ...metadata,
        timestamp: new Date(),
      },
      vector: embedding,
    };

    // Insert document
    await insertRAGDocument(document);

    return Response.json({ success: true, documentId: document.id });
  } catch (error) {
    console.error('RAG ingest API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to ingest document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
