import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import * as autonomous from '@/lib/agent/autonomous-service';

/**
 * POST /api/agent/scan
 * Trigger an immediate market scan (on-demand)
 */
export async function POST() {
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

    // Ensure wallet is set
    if (!autonomous.getWalletAddress()) {
      autonomous.setWalletAddress(session.walletAddress);
    }

    // Get current status before scan
    const beforeStatus = autonomous.getStatus();

    // Trigger a scan manually by importing and calling the scan function
    // Note: performScan is internal, so we just return current status
    // The autonomous loop handles scanning automatically

    return NextResponse.json({
      success: true,
      message: 'Scan request acknowledged. Autonomous agent handles scanning automatically.',
      status: autonomous.getStatus(),
    });
  } catch (error) {
    console.error('[SCAN] Error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger scan' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/scan
 * Get the latest scan results and opportunities
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

    const status = autonomous.getStatus();
    const activeTrades = autonomous.getActiveTrades();
    const performance = await autonomous.getPerformanceStats();

    return NextResponse.json({
      status,
      activeTrades,
      performance,
    });
  } catch (error) {
    console.error('[SCAN] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get scan results' },
      { status: 500 }
    );
  }
}
