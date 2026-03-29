import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/astra/client';
import { COLLECTIONS } from '@/lib/astra/collections';
import type { UserDocument } from '@/lib/astra/collections';

export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.nextUrl.searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const db = getDb();
    let user = null;
    try {
      user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
        walletAddress,
      });
    } catch (e) {
      // Collection doesn't exist yet - user not found
      console.log('Users collection not found or error:', e instanceof Error ? e.message : 'unknown');
    }

    return NextResponse.json({
      exists: !!user,
      acceptedDisclaimer: user?.acceptedDisclaimer || false,
      acceptedAt: user?.acceptedAt,
    });
  } catch (error) {
    console.error('User status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check user status' },
      { status: 500 }
    );
  }
}
