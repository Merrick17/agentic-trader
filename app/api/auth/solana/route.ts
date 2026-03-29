import { NextRequest, NextResponse } from 'next/server';
import { generateNonce, createSignMessage, storeUser } from '@/lib/solana/auth';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const nonce = generateNonce();
    const message = createSignMessage(walletAddress, nonce);

    // Store nonce temporarily (expires in 10 minutes)
    // In production, use Redis or similar

    return NextResponse.json({
      nonce,
      message,
      walletAddress,
    });
  } catch (error) {
    console.error('Auth init error:', error);
    return NextResponse.json(
      { error: 'Authentication initialization failed' },
      { status: 500 }
    );
  }
}
