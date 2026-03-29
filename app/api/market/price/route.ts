import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getTokenPairs } from '@/lib/data/dexscreener';

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
    const address = searchParams.get('address');

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Token address required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch token pairs
    const pairs = await getTokenPairs(address);

    if (!pairs.length) {
      return Response.json({ price: null, priceChange24h: 0 });
    }

    // Get the pair with highest liquidity
    const bestPair = pairs.sort((a, b) =>
      (b.liquidityUsd || 0) - (a.liquidityUsd || 0)
    )[0];

    return Response.json({
      price: parseFloat(bestPair.priceUsd) || 0,
      priceChange24h: bestPair.priceChange?.h24 || 0,
      volume24h: bestPair.volume?.h24 || 0,
      liquidity: bestPair.liquidityUsd || 0,
      marketCap: bestPair.marketCap || bestPair.fdv || 0,
    });
  } catch (error) {
    console.error('Token price API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch price' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
