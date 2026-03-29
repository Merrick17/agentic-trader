import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';
import { getDb } from '@/lib/astra/client';
import { COLLECTIONS, ensureCollection } from '@/lib/astra/collections';
import type { Portfolio } from '@/types/portfolio';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('matrix_session')?.value;

    if (!sessionId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const walletAddress = session.walletAddress;

    const { searchParams } = new URL(req.url);

    // Check if this is a history request
    if (searchParams.has('days')) {
      const days = parseInt(searchParams.get('days') || '30');

      // Fetch actual portfolio history from database
      const db = getDb();
      const historyCollection = db.collection('portfolio_history');

      try {
        const historyDocs = await historyCollection
          .find({})
          .sort({ timestamp: -1 })
          .limit(days)
          .toArray();

        if (historyDocs.length > 0) {
          return Response.json({ history: historyDocs });
        }
      } catch (e) {
        // Collection might not exist, return empty
      }

      // Return empty history if no data
      return Response.json({ history: [] });
    }

    // Fetch real portfolio from Astra DB
    const db = getDb();
    
    // Ensure collection exists before querying to prevent 500 errors
    await ensureCollection(COLLECTIONS.PORTFOLIO);
    const portfolioCollection = db.collection(COLLECTIONS.PORTFOLIO);

    let portfolioDoc = null;
    try {
      portfolioDoc = await portfolioCollection.findOne({ id: 'main', walletAddress: session.walletAddress });
    } catch (err) {
      console.warn('Could not find portfolio doc or collection might be empty:', err);
    }

    if (!portfolioDoc) {
      // Return empty portfolio - no positions yet
      const emptyPortfolio: Portfolio = {
        id: 'main',
        totalValue: 0,
        costBasis: 0,
        totalRealizedPnL: 0,
        totalUnrealizedPnL: 0,
        totalPnLPercentage: 0,
        positions: [],
        lastUpdated: new Date(),
      };

      return Response.json({ portfolio: emptyPortfolio });
    }

    // Map document to Portfolio type
    const portfolio: Portfolio = {
      id: portfolioDoc.id,
      totalValue: portfolioDoc.totalValue || 0,
      costBasis: portfolioDoc.costBasis || 0,
      totalRealizedPnL: portfolioDoc.totalRealizedPnL || 0,
      totalUnrealizedPnL: portfolioDoc.totalUnrealizedPnL || 0,
      totalPnLPercentage: portfolioDoc.totalPnLPercentage || 0,
      positions: (portfolioDoc.positions || []).map((pos: Record<string, unknown>) => ({
        id: pos.id as string,
        tokenAddress: pos.tokenAddress as string,
        tokenSymbol: pos.tokenSymbol as string,
        tokenName: pos.tokenName as string,
        balance: pos.balance as number,
        avgEntryPrice: pos.avgEntryPrice as number,
        currentPrice: pos.currentPrice as number,
        totalValue: pos.totalValue as number,
        costBasis: pos.costBasis as number,
        unrealizedPnL: pos.unrealizedPnL as number,
        unrealizedPnLPercentage: pos.unrealizedPnLPercentage as number,
        allocationPercentage: pos.allocationPercentage as number,
        lastUpdated: new Date(pos.lastUpdated as string),
      })),
      lastUpdated: new Date(portfolioDoc.lastUpdated),
    };

    return Response.json({ portfolio });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch portfolio' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('matrix_session')?.value;

    if (!sessionId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const walletAddress = session.walletAddress;

    const portfolioData = await req.json();

    const db = getDb();
    
    // Ensure collection exists
    await ensureCollection(COLLECTIONS.PORTFOLIO);
    const portfolioCollection = db.collection(COLLECTIONS.PORTFOLIO);

    await portfolioCollection.updateOne(
      { id: 'main', walletAddress },
      {
        $set: {
          ...portfolioData,
          walletAddress,
          lastUpdated: new Date(),
        }
      },
      { upsert: true }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update portfolio API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update portfolio' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
