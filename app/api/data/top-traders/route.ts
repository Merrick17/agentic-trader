import axios from 'axios';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

/**
 * GET /api/data/top-traders?mint=...&timeframe=...
 * Returns top traders for a token from Birdeye
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');
    const timeframe = searchParams.get('timeframe') || '24h';

    if (!mint) {
      return NextResponse.json({ error: 'Mint parameter required' }, { status: 400 });
    }

    const apiKey = process.env.BIRDEYE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Birdeye V2 Top Traders API
    const params = new URLSearchParams({
      address: mint,
      time_frame: timeframe,
      sort_by: 'volume',
      sort_type: 'desc',
      limit: '20',
      offset: '0',
    });

    const response = await axios.get(`${BIRDEYE_API_BASE}/defi/v2/tokens/top_traders?${params.toString()}`, {
      headers: {
        'X-API-KEY': apiKey,
        'x-chain': 'solana',
        'accept': 'application/json',
      },
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      throw new Error(`Birdeye API error: ${response.status}`);
    }

    const data = response.data;
    console.log('[AXIOS] Top traders output:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Top traders API error:', error);
    return NextResponse.json({ error: 'Failed to fetch top traders' }, { status: 500 });
  }
}
