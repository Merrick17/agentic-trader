import axios from 'axios';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

/**
 * GET /api/data/token-list
 * Returns top tokens from Birdeye sorted by volume
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

    const apiKey = process.env.BIRDEYE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Birdeye V3 Token List API
    const params = new URLSearchParams({
      sort_by: 'v24hUSD',
      sort_type: 'desc',
      limit: '50',
      offset: '0',
    });

    const response = await axios.get(`${BIRDEYE_API_BASE}/defi/v3/token/list?${params.toString()}`, {
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
    console.log('[AXIOS] Token list output:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Token list API error:', error);
    return NextResponse.json({ error: 'Failed to fetch token list' }, { status: 500 });
  }
}
