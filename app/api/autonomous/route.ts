import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import * as autonomous from '@/lib/agent/autonomous-service';

/**
 * GET /api/autonomous
 * Get autonomous agent status and stats
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
    const settings = autonomous.getSettings();

    return NextResponse.json({
      status,
      activeTrades,
      performance,
      settings,
    });
  } catch (error) {
    console.error('[AUTONOMOUS] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get autonomous agent status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autonomous
 * Start the autonomous agent
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

    // Enable auto trading in settings first
    try {
      const { getDb } = await import('@/lib/astra/client');
      const { COLLECTIONS, ensureCollection } = await import('@/lib/astra/collections');
      const { DEFAULT_AGENT_SETTINGS } = await import('@/types/settings');

      await ensureCollection(COLLECTIONS.USER_SETTINGS);
      await getDb()
        .collection(COLLECTIONS.USER_SETTINGS)
        .updateOne(
          { user_id: session.walletAddress },
          { $set: { autoTradingEnabled: true, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
    } catch (e) {
      console.error('[AUTONOMOUS] Failed to enable auto trading in settings:', e);
    }

    // Start autonomous trading with user's wallet
    await autonomous.start(session.walletAddress);

    return NextResponse.json({
      success: true,
      message: 'Autonomous trading started',
      status: autonomous.getStatus(),
    });
  } catch (error) {
    console.error('[AUTONOMOUS] POST start error:', error);
    return NextResponse.json(
      { error: 'Failed to start autonomous agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/autonomous
 * Stop the autonomous agent
 */
export async function DELETE() {
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

    autonomous.stop();

    return NextResponse.json({
      success: true,
      message: 'Autonomous trading stopped',
      status: autonomous.getStatus(),
    });
  } catch (error) {
    console.error('[AUTONOMOUS] DELETE stop error:', error);
    return NextResponse.json(
      { error: 'Failed to stop autonomous agent' },
      { status: 500 }
    );
  }
}
