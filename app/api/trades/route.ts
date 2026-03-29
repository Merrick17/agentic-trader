import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import type { Trade } from '@/types/trade';

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const tradeId = searchParams.get('id');

    // Return empty trades - no trades executed yet
    // This will be populated when the agent actually executes trades
    const trades: Trade[] = [];

    if (tradeId) {
      const trade = trades.find((t) => t.id === tradeId);
      return Response.json({ trade: trade || null });
    }

    return Response.json({ trades });
  } catch (error) {
    console.error('Trades API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch trades' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

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

    const tradeData = await req.json();
    console.log('New trade:', tradeData);

    // Trade will be stored when executed
    return Response.json({ success: true, tradeId: `trade_${Date.now()}` });
  } catch (error) {
    console.error('Create trade API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create trade' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
