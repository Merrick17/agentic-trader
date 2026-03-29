import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getDb } from '@/lib/astra/client';
import { COLLECTIONS, ensureCollection } from '@/lib/astra/collections';
import type { AgentSettings } from '@/types/settings';
import { DEFAULT_AGENT_SETTINGS, RISK_PRESETS } from '@/types/settings';

/**
 * POST /api/settings/preset
 * Apply a risk preset to user settings
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

    const { preset } = await req.json();

    if (!preset || !['conservative', 'moderate', 'aggressive'].includes(preset)) {
      return NextResponse.json(
        { error: 'Invalid preset. Must be conservative, moderate, or aggressive' },
        { status: 400 }
      );
    }

    await ensureCollection(COLLECTIONS.USER_SETTINGS);

    const presetSettings = RISK_PRESETS[preset as keyof typeof RISK_PRESETS];
    const now = new Date().toISOString();

    const settings = {
      ...DEFAULT_AGENT_SETTINGS,
      ...presetSettings,
      riskLevel: preset as AgentSettings['riskLevel'],
      updatedAt: now,
      user_id: session.walletAddress,
    };

    await getDb()
      .collection<AgentSettings & { _id: string; user_id: string }>(COLLECTIONS.USER_SETTINGS)
      .updateOne(
        { user_id: session.walletAddress },
        { $set: settings as unknown as Partial<AgentSettings> },
        { upsert: true }
      );

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        user_id: undefined, // Don't expose internal field
      },
    });
  } catch (error) {
    console.error('[SETTINGS/PRESET] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to apply preset' },
      { status: 500 }
    );
  }
}
