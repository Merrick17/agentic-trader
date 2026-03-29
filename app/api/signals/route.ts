import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getTrendingTokens, convertToSignal } from '@/lib/data/dexscreener';
import type { Signal } from '@/types/signal';

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
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('🔍 Fetching real-time signals from DexScreener...');

    // Fetch trending tokens
    const trendingPairs = await getTrendingTokens(limit);

    if (!trendingPairs.length) {
      console.warn('⚠️ No data from DexScreener - API may be rate limited or no tokens found');
      return Response.json({ signals: [] });
    }

    console.log(`✅ Found ${trendingPairs.length} trending tokens`);

    // Convert to signals
    const signals: Signal[] = [];

    for (const pair of trendingPairs) {
      // Calculate confidence score
      const volumeScore = Math.min((pair.volume?.h24 || 0) / 100000, 40);
      const priceChangeScore = Math.min(Math.abs(pair.priceChange?.h24 || 0) * 2, 30);
      const liquidityScore = Math.min((pair.liquidityUsd || 0) / 50000, 20);
      const confidence = Math.min(Math.round(volumeScore + priceChangeScore + liquidityScore + 10), 100);

      const signal = convertToSignal(pair, confidence);
      signals.push(signal);
    }

    // Sort by confidence
    signals.sort((a, b) => b.confidence - a.confidence);

    console.log(`✅ Returning ${signals.length} real-time signals`);

    return Response.json({ signals });
  } catch (error) {
    console.error('❌ Signals API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch signals', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
