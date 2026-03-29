import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { NextResponse } from 'next/server';
import { runAutonomousCycle, getAgentState, getAgentConfig } from '@/lib/agent/autonomous';

/**
 * POST /api/agent/scheduled-scan
 * Triggered by cron job to run autonomous scan
 * Can also be called manually for testing
 */
export async function POST(req: Request) {
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

    const config = getAgentConfig();
    const state = getAgentState();

    // Only run if autonomous mode is enabled
    if (!config.autonomousEnabled) {
      return NextResponse.json({
        executed: false,
        reason: 'Autonomous mode is disabled',
        state,
      });
    }

    // Check if already running
    if (state.mode === 'scanning' || state.mode === 'analyzing' || state.mode === 'trading') {
      return NextResponse.json({
        executed: false,
        reason: `Agent is currently ${state.mode}`,
        state,
      });
    }

    // Run the scan
    console.log('[Cron] Triggering autonomous scan...');
    await runAutonomousCycle();

    const newState = getAgentState();

    return NextResponse.json({
      executed: true,
      message: 'Scan completed successfully',
      state: newState,
      signalsGenerated: newState.signalsGenerated - state.signalsGenerated,
    });

  } catch (error) {
    console.error('[Cron] Scheduled scan error:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduled scan', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/scheduled-scan
 * Get status of scheduled scanning
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

    const state = getAgentState();
    const config = getAgentConfig();

    return NextResponse.json({
      scheduled: config.autonomousEnabled,
      intervalMs: config.scanIntervalMs,
      nextScanAt: state.lastScanAt
        ? new Date(new Date(state.lastScanAt).getTime() + config.scanIntervalMs).toISOString()
        : null,
      state,
      config,
    });

  } catch (error) {
    console.error('[Cron] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduled scan status' },
      { status: 500 }
    );
  }
}
