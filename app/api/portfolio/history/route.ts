import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getDb } from '@/lib/astra/client';
import { COLLECTIONS } from '@/lib/astra/collections';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const db = getDb();

    // Try to fetch from portfolio_history collection
    try {
      const historyCollection = db.collection(COLLECTIONS.PORTFOLIO_HISTORY);
      const historyDocs = await historyCollection
        .find({ walletAddress: session.walletAddress })
        .sort({ timestamp: -1 })
        .limit(days)
        .toArray();

      if (historyDocs.length > 0) {
        const formatted = historyDocs.map((doc) => ({
          date: (doc as { timestamp?: string; date?: string }).timestamp || (doc as { date?: string }).date || new Date().toISOString(),
          totalValue: (doc as { totalValue?: number }).totalValue || 0,
          pnl: (doc as { pnl?: number }).pnl || 0,
        }));

        return Response.json({ history: formatted });
      }
    } catch (e) {
      // Collection might not exist
      console.log('Portfolio history collection not found, returning empty');
    }

    // Return empty - the frontend will handle it
    return Response.json({ history: [] });
  } catch (error) {
    console.error('Portfolio history API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch portfolio history' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
