import axios from 'axios';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

/**
 * GET /api/data/ohlcv?mint=...&interval=...&hoursBack=...
 * Returns OHLCV candlestick data from Birdeye V3
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
    const interval = searchParams.get('interval') || '15m';
    const hoursBack = parseInt(searchParams.get('hoursBack') || '24');

    if (!mint) {
      return NextResponse.json({ error: 'Mint parameter required' }, { status: 400 });
    }

    const apiKey = process.env.BIRDEYE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Birdeye V3 OHLCV API - supports 1s, 15s, 30s, 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 8H, 12H, 1D, 3D, 1W, 1M
    const now = Math.floor(Date.now() / 1000);
    const from = now - hoursBack * 3600;

    const params = new URLSearchParams({
      address: mint,
      type: interval,
      time_from: String(from),
      time_to: String(now),
      currency: 'usd',
      count_limit: '5000',
    });

    const response = await axios.get(`${BIRDEYE_API_BASE}/defi/v3/ohlcv?${params.toString()}`, {
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
    console.log('[AXIOS] OHLCV output data length:', data?.data?.items?.length || 0);

    // Transform Birdeye response to chart data format
    const items = data.data?.items?.map((item: {
      unix_time: number;
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
    }) => ({
      time: item.unix_time,
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
    })) || [];

    return NextResponse.json({ items });
  } catch (error) {
    console.error('OHLCV API error:', error);
    return NextResponse.json({ error: 'Failed to fetch OHLCV data' }, { status: 500 });
  }
}
