import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, createSession, storeUser } from '@/lib/solana/auth';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, message, signature, acceptedDisclaimer } = await req.json();

    if (!walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the signature
    const isValid = await verifySignature(message, signature, walletAddress);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Store user and disclaimer acceptance
    await storeUser(walletAddress, acceptedDisclaimer);

    // Create session
    const sessionId = await createSession(walletAddress);

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      walletAddress,
    });

    response.cookies.set('matrix_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Auth verify error:', error);
    return NextResponse.json(
      { error: 'Authentication verification failed' },
      { status: 500 }
    );
  }
}
