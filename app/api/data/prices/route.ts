import axios from 'axios';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';

const JUPITER_API_BASE = 'https://api.jup.ag';

/**
 * GET /api/data/prices?mints=...
 * Returns token prices from Jupiter Price V3 API
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
    const mints = searchParams.get('mints');

    if (!mints) {
      return NextResponse.json({ error: 'Mints parameter required' }, { status: 400 });
    }

    const apiKey = process.env.JUPITER_API_KEY || process.env.JUP_API_KEY;
    const headers: Record<string, string> = {
      'accept': 'application/json',
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    // Jupiter Price API v3
    const response = await axios.get(`${JUPITER_API_BASE}/price/v3?ids=${mints}`, {
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const data = response.data;
    console.log('[AXIOS] Jupiter prices output:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Prices API error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
