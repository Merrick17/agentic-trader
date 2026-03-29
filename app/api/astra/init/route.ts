import { NextResponse } from 'next/server';
import { DataAPIClient } from '@datastax/astra-db-ts';
import { COLLECTIONS } from '@/lib/astra/collections';

const TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT;
const NAMESPACE = process.env.ASTRA_DB_NAMESPACE;

export async function POST() {
  try {
    if (!TOKEN || !ENDPOINT || !NAMESPACE) {
      return NextResponse.json(
        {
          error: 'Missing required environment variables',
          missing: [
            !TOKEN && 'ASTRA_DB_APPLICATION_TOKEN',
            !ENDPOINT && 'ASTRA_DB_API_ENDPOINT',
            !NAMESPACE && 'ASTRA_DB_NAMESPACE',
          ].filter(Boolean),
        },
        { status: 500 }
      );
    }

    const client = new DataAPIClient(TOKEN);
    const db = client.db(ENDPOINT, { keyspace: NAMESPACE });

    // Collections to create
    const collections = [
      { name: COLLECTIONS.SIGNALS, vector: false },
      { name: COLLECTIONS.TRADES, vector: false },
      { name: COLLECTIONS.PORTFOLIO, vector: false },
      { name: COLLECTIONS.AGENT_LOGS, vector: false },
      { name: COLLECTIONS.RAG_DOCUMENTS, vector: false },
      {
        name: COLLECTIONS.RAG_VECTORS,
        vector: true,
        dimension: 1536,
        metric: 'cosine' as const,
      },
    ];

    const results = [];

    // Get existing collections
    const existingCollections = await db.listCollections();
    const existingNames = existingCollections.map((c: any) =>
      typeof c === 'string' ? c : c.name
    );

    for (const { name, vector, dimension, metric } of collections) {
      try {
        // Check if collection exists
        if (existingNames.includes(name)) {
          results.push({ name, status: 'exists' });
          continue;
        }

        if (vector && dimension) {
          // Create vector collection
          await db.createCollection(name, {
            vector: {
              dimension,
              metric,
            },
          });
          results.push({ name, status: 'created', type: 'vector', dimension, metric });
        } else {
          // Create regular collection
          await db.createCollection(name);
          results.push({ name, status: 'created' });
        }
      } catch (error) {
        results.push({ name, status: 'error', error: String(error) });
      }
    }

    const finalCollections = await db.listCollections();

    return NextResponse.json({
      success: true,
      keyspace: NAMESPACE,
      results,
      collections: finalCollections,
    });
  } catch (error) {
    console.error('Failed to initialize Astra DB:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check existing collections
export async function GET() {
  try {
    if (!TOKEN || !ENDPOINT || !NAMESPACE) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    const client = new DataAPIClient(TOKEN);
    const db = client.db(ENDPOINT, { keyspace: NAMESPACE });
    const collections = await db.listCollections();

    return NextResponse.json({
      keyspace: NAMESPACE,
      collections,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get collections', details: String(error) },
      { status: 500 }
    );
  }
}
