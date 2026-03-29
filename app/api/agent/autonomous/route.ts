import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { NextResponse } from 'next/server';
import {
  getAgentState,
  getAgentConfig,
  updateAgentConfig,
  startAutonomousMode,
  stopAutonomousMode,
  runAutonomousCycle,
  AgentMode,
  DEFAULT_AUTONOMOUS_CONFIG,
} from '@/lib/agent/autonomous';

/**
 * GET /api/agent/autonomous
 * Get current autonomous agent state and configuration
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
      state: {
        ...state,
        mode: state.mode as AgentMode,
      },
      config,
    });
  } catch (error) {
    console.error('[API] Autonomous GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get autonomous agent state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/autonomous
 * Control the autonomous agent (start/stop/trigger)
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

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'start':
        startAutonomousMode();
        return NextResponse.json({
          success: true,
          message: 'Autonomous mode started',
          state: getAgentState(),
        });

      case 'stop':
        stopAutonomousMode();
        return NextResponse.json({
          success: true,
          message: 'Autonomous mode stopped',
          state: getAgentState(),
        });

      case 'trigger':
        // Manually trigger a scan cycle
        await runAutonomousCycle();
        return NextResponse.json({
          success: true,
          message: 'Autonomous cycle triggered',
          state: getAgentState(),
        });

      case 'update_config':
        const { config } = body;
        if (!config) {
          return NextResponse.json(
            { error: 'Config is required' },
            { status: 400 }
          );
        }

        // Validate config values
        const validatedConfig = {
          ...config,
          maxTradeAmount: Math.min(config.maxTradeAmount || 100, 10000),
          minConfidence: Math.max(0, Math.min(100, config.minConfidence || 75)),
          maxPositions: Math.max(1, Math.min(20, config.maxPositions || 5)),
          stopLossPct: Math.max(1, Math.min(50, config.stopLossPct || 15)),
        };

        updateAgentConfig(validatedConfig);

        return NextResponse.json({
          success: true,
          message: 'Configuration updated',
          config: getAgentConfig(),
        });

      case 'reset_config':
        updateAgentConfig(DEFAULT_AUTONOMOUS_CONFIG);
        return NextResponse.json({
          success: true,
          message: 'Configuration reset to defaults',
          config: getAgentConfig(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, trigger, update_config, reset_config' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Autonomous POST error:', error);
    return NextResponse.json(
      { error: 'Failed to control autonomous agent' },
      { status: 500 }
    );
  }
}
