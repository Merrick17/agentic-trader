/**
 * Data Sync Service - Fetches real-time data from DexScreener and Birdeye
 * and syncs it to Astra DB for the trading dashboard
 */

import { getDb } from '@/lib/astra/client';
import { COLLECTIONS } from '@/lib/astra/collections';
import { getTrendingTokens, convertToSignal as convertDexSignal } from './dexscreener';
import { getTokenInfo, convertToSignal as convertBirdeyeSignal } from './birdeye';
import type { Signal } from '@/types/signal';

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

/**
 * Fetch and sync trending tokens from DexScreener
 */
export async function syncTrendingSignals(limit = 20): Promise<Signal[]> {
  try {
    console.log('🔄 Syncing trending tokens from DexScreener...');

    // Fetch trending tokens
    const trendingPairs = await getTrendingTokens(limit);

    if (!trendingPairs.length) {
      console.warn('No trending tokens fetched from DexScreener');
      return [];
    }

    const db = getDb();
    const signalsCollection = db.collection(COLLECTIONS.SIGNALS);
    const signals: Signal[] = [];

    // Process each pair and create signals
    for (const pair of trendingPairs) {
      // Calculate confidence score based on volume and price change
      const volumeScore = Math.min(pair.volume?.h24 / 100000, 40); // Max 40 pts for volume
      const priceChangeScore = Math.min(Math.abs(pair.priceChange?.h24 || 0) * 2, 30); // Max 30 pts
      const liquidityScore = Math.min(pair.liquidityUsd / 50000, 20); // Max 20 pts
      const confidence = Math.min(Math.round(volumeScore + priceChangeScore + liquidityScore + 10), 100);

      const signal = convertDexSignal(pair, confidence);

      // Check if signal already exists (update instead of insert)
      const existing = await signalsCollection.findOne({
        tokenAddress: signal.tokenAddress
      });

      if (existing) {
        // Update existing signal
        await signalsCollection.updateOne(
          { tokenAddress: signal.tokenAddress },
          {
            $set: {
              price: signal.price,
              priceChange24h: signal.priceChange24h,
              volume24h: signal.volume24h,
              liquidity: signal.liquidity,
              confidence: signal.confidence,
              sentiment: signal.sentiment,
              timestamp: new Date(),
              'metadata.txns24h': signal.metadata?.txns24h,
            }
          }
        );
      } else {
        // Insert new signal
        await signalsCollection.insertOne({
          id: signal.id,
          tokenAddress: signal.tokenAddress,
          tokenSymbol: signal.tokenSymbol,
          tokenName: signal.tokenName,
          price: signal.price,
          priceChange24h: signal.priceChange24h,
          volume24h: signal.volume24h,
          marketCap: signal.marketCap,
          liquidity: signal.liquidity,
          confidence: signal.confidence,
          sentiment: signal.sentiment,
          source: signal.source,
          timestamp: new Date(),
          metadata: signal.metadata,
          status: 'active',
        });
      }

      signals.push(signal);
    }

    console.log(`✅ Synced ${signals.length} signals to Astra DB`);
    return signals;
  } catch (error) {
    console.error('❌ Error syncing trending signals:', error);
    return [];
  }
}

/**
 * Fetch detailed token info from Birdeye and update signal
 */
export async function enrichSignalWithBirdeye(tokenAddress: string): Promise<Partial<Signal> | null> {
  if (!BIRDEYE_API_KEY) {
    console.warn('Birdeye API key not configured, skipping enrichment');
    return null;
  }

  try {
    const tokenInfo = await getTokenInfo(tokenAddress, BIRDEYE_API_KEY);

    if (!tokenInfo) return null;

    const db = getDb();
    const signalsCollection = db.collection(COLLECTIONS.SIGNALS);

    // Update signal with Birdeye data
    await signalsCollection.updateOne(
      { tokenAddress },
      {
        $set: {
          price: tokenInfo.price,
          priceChange24h: tokenInfo.priceChange24h,
          volume24h: tokenInfo.volume24h,
          marketCap: tokenInfo.marketCap,
          liquidity: tokenInfo.liquidity,
          'metadata.holderCount': tokenInfo.holderCount,
          'metadata.decimals': tokenInfo.decimals,
          timestamp: new Date(),
        }
      }
    );

    return convertBirdeyeSignal(tokenInfo, 0);
  } catch (error) {
    console.error(`Error enriching signal for ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Sync portfolio positions with real data
 */
export async function syncPortfolioData(): Promise<void> {
  try {
    console.log('🔄 Syncing portfolio data...');

    const db = getDb();
    const portfolioCollection = db.collection(COLLECTIONS.PORTFOLIO);
    const signalsCollection = db.collection(COLLECTIONS.SIGNALS);

    // Get current portfolio
    const portfolioDoc = await portfolioCollection.findOne({ id: 'main' });

    if (!portfolioDoc || !portfolioDoc.positions?.length) {
      console.log('No portfolio positions to sync');
      return;
    }

    // Update each position with current prices
    let totalValue = 0;
    let totalCostBasis = 0;
    const updatedPositions = [];

    for (const position of portfolioDoc.positions) {
      // Get latest price from signals
      const signal = await signalsCollection.findOne({
        tokenAddress: position.tokenAddress
      }, {
        sort: { timestamp: -1 }
      });

      const currentPrice = signal?.price || position.currentPrice;
      const totalPositionValue = position.balance * currentPrice;
      const unrealizedPnL = totalPositionValue - position.costBasis;
      const unrealizedPnLPercentage = position.costBasis > 0
        ? (unrealizedPnL / position.costBasis) * 100
        : 0;

      updatedPositions.push({
        ...position,
        currentPrice,
        totalValue: totalPositionValue,
        unrealizedPnL,
        unrealizedPnLPercentage,
        lastUpdated: new Date(),
      });

      totalValue += totalPositionValue;
      totalCostBasis += position.costBasis;
    }

    const totalPnL = totalValue - totalCostBasis;
    const totalPnLPercentage = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

    // Update portfolio
    await portfolioCollection.updateOne(
      { id: 'main' },
      {
        $set: {
          totalValue,
          costBasis: totalCostBasis,
          totalUnrealizedPnL: totalPnL,
          totalPnLPercentage,
          positions: updatedPositions,
          lastUpdated: new Date(),
        }
      },
      { upsert: true }
    );

    console.log('✅ Portfolio synced:', { totalValue, totalPnL: totalPnL.toFixed(2) });
  } catch (error) {
    console.error('❌ Error syncing portfolio:', error);
  }
}

/**
 * Run full data sync - call this periodically
 */
export async function runDataSync(): Promise<void> {
  console.log('🚀 Starting data sync...');

  // Sync trending signals
  await syncTrendingSignals(20);

  // Sync portfolio
  await syncPortfolioData();

  console.log('✅ Data sync complete');
}
