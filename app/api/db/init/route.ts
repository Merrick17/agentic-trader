import { NextResponse } from 'next/server';
import { initializeCollections, COLLECTIONS } from '@/lib/astra/collections';
import { checkConnection } from '@/lib/astra/client';

/**
 * Database initialization endpoint
 * Call this to create all required collections in AstraDB
 * Can be called multiple times safely (idempotent)
 */
export async function POST() {
  try {
    // Check connection first
    const connected = await checkConnection();
    if (!connected) {
      return NextResponse.json(
        { error: 'Failed to connect to AstraDB' },
        { status: 500 }
      );
    }

    // Initialize all collections
    await initializeCollections();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      collections: Object.values(COLLECTIONS),
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check database status
 */
export async function GET() {
  try {
    const connected = await checkConnection();

    if (!connected) {
      return NextResponse.json(
        { status: 'disconnected', error: 'Failed to connect to AstraDB' },
        { status: 503 }
      );
    }

    const db = (await import('@/lib/astra/client')).getDb();
    const collections = await db.listCollections();

    return NextResponse.json({
      status: 'connected',
      collections: collections.map(c => c.name),
      required: Object.values(COLLECTIONS),
      missing: Object.values(COLLECTIONS).filter(
        name => !collections.some(c => c.name === name)
      ),
    });
  } catch (error) {
    console.error('Database status check error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to check database status' },
      { status: 500 }
    );
  }
}
