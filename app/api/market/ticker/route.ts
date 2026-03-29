import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getTrendingTokens } from '@/lib/data/dexscreener';

export async function GET() {
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

    // Fetch trending tokens from DexScreener
    const pairs = await getTrendingTokens(15);

    if (!pairs.length) {
      return Response.json({ tokens: [] });
    }

    // Transform to market ticker format
    const tokens = pairs.map((pair) => ({
      symbol: `${pair.baseToken.symbol}/USD`,
      name: pair.baseToken.name,
      price: parseFloat(pair.priceUsd) || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
      volume24h: pair.volume?.h24 || 0,
      marketCap: pair.marketCap || pair.fdv || 0,
    }));

    // Sort by volume
    tokens.sort((a, b) => b.volume24h - a.volume24h);

    return Response.json({ tokens });
  } catch (error) {
    console.error('Market ticker API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch market data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
