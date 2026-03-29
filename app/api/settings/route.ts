import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getDb } from '@/lib/astra/client';
import { COLLECTIONS, ensureCollection } from '@/lib/astra/collections';
import type { AgentSettings } from '@/types/settings';
import { DEFAULT_AGENT_SETTINGS } from '@/types/settings';

/**
 * GET /api/settings
 * Get user's agent settings
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

    await ensureCollection(COLLECTIONS.USER_SETTINGS);

    const settings = await getDb()
      .collection<AgentSettings & { _id: string; user_id: string }>(COLLECTIONS.USER_SETTINGS)
      .findOne({ user_id: session.walletAddress });

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({ settings: DEFAULT_AGENT_SETTINGS, isDefault: true });
    }

    // Remove internal fields
    const { _id, user_id, ...userSettings } = settings;
    return NextResponse.json({ settings: userSettings, isDefault: false });
  } catch (error) {
    console.error('[SETTINGS] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Update user's agent settings
 */
export async function PUT(req: Request) {
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

    await ensureCollection(COLLECTIONS.USER_SETTINGS);

    const now = new Date().toISOString();
    const settings: Partial<AgentSettings> & { user_id: string } = {
      user_id: session.walletAddress,
      ...body,
      updatedAt: now,
    };

    // Upsert settings
    await getDb()
      .collection<AgentSettings & { _id: string; user_id: string }>(COLLECTIONS.USER_SETTINGS)
      .updateOne(
        { user_id: session.walletAddress },
        { $set: settings as Partial<AgentSettings> },
        { upsert: true }
      );

    return NextResponse.json({
      success: true,
      settings: {
        ...DEFAULT_AGENT_SETTINGS,
        ...body,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('[SETTINGS] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
