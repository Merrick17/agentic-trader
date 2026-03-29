import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getTrendingTokens, getTokenProfiles, getBoostedTokens } from '@/lib/data/dexscreener';

/**
 * GET /api/data/trending
 *
 * Agent-driven: discovers tokens organically from DexScreener's live feeds
 * (boosted tokens + latest profiles). No hardcoded symbol lists.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('matrix_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // All three calls share the same underlying discovery requests (boosted + profiles)
    // Run in parallel to minimise latency
    const [pairs, boosted, profiles] = await Promise.all([
      getTrendingTokens(20),
      getBoostedTokens(),
      getTokenProfiles(),
    ]);

    return NextResponse.json({
      pairs,
      boosted: boosted.filter((t) => t.chainId === 'solana'),
      profiles: profiles.filter((p) => p.chainId === 'solana'),
    });
  } catch (error) {
    console.error('[/api/data/trending] error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending tokens' }, { status: 500 });
  }
}
