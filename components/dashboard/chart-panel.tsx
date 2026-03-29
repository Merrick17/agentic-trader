'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgentStore } from '@/hooks/useAgentStore';
import { TrendingUp, Activity } from 'lucide-react';

const INTERVALS = ['1m', '5m', '15m', '1H', '4H'] as const;
type Timeframe = typeof INTERVALS[number];

export function ChartPanel() {
  const { ohlcvData, selectedMint, tokenList } = useAgentStore();
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [isLoading, setIsLoading] = useState(false);
  const [localCandles, setLocalCandles] = useState<typeof ohlcvData>([]);

  const selectedToken = tokenList.find((t) => t.address === selectedMint);

  // Fetch candles when selected token or timeframe changes
  useEffect(() => {
    if (!selectedMint) return;

    const fetchCandles = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/data/ohlcv?mint=${selectedMint}&interval=${timeframe}`);
        if (res.ok) {
          const data = await res.json();
          setLocalCandles(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching candles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandles();
    const id = setInterval(fetchCandles, 60000);
    return () => clearInterval(id);
  }, [selectedMint, timeframe]);

  const candles = localCandles.length > 0 ? localCandles : ohlcvData;
  const hasData = candles.length > 0;

  // Calculate price range for visualization
  const prices = candles.map(c => [c.open, c.high, c.low, c.close]).flat();
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceRange = maxPrice - minPrice || 1;

  return (
    <Card className="border-primary/20 bg-black/80 backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="p-4 pb-2 border-b border-primary/10 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xs font-mono flex items-center gap-2 text-primary">
            <TrendingUp className="h-4 w-4" />
            {selectedToken ? `${selectedToken.symbol} / USD` : 'CHART_VIEWER'}
          </CardTitle>
          {selectedToken && (
            <Badge
              variant="outline"
              className={selectedToken.priceChange24h >= 0
                ? 'text-[10px] border-emerald-500/30 text-emerald-400'
                : 'text-[10px] border-red-500/30 text-red-400'
              }
            >
              {selectedToken.priceChange24h >= 0 ? '+' : ''}{selectedToken.priceChange24h.toFixed(2)}%
            </Badge>
          )}
        </div>

        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
          <TabsList className="bg-black/60 h-7">
            {INTERVALS.map((i) => (
              <TabsTrigger
                key={i}
                value={i}
                className="text-[10px] px-2 h-5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                {i}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-full w-full bg-primary/5" />
          </div>
        ) : !selectedMint ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary blur-xl opacity-20" />
              <Activity className="relative h-12 w-12 text-primary/30" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">[NO_TOKEN_SELECTED]</p>
            <p className="text-xs text-muted-foreground/50 mt-1 font-mono">Select a token from the scanner to view chart</p>
          </div>
        ) : !hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary blur-xl opacity-20" />
              <Activity className="relative h-12 w-12 text-primary/30" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">[NO_DATA]</p>
            <p className="text-xs text-muted-foreground/50 mt-1 font-mono">No OHLCV data available</p>
          </div>
        ) : (
          <div className="h-full flex flex-col p-4">
            {/* Simple candle visualization */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-full flex items-end justify-around gap-1">
                {candles.slice(-50).map((candle, i) => {
                  const isGreen = candle.close >= candle.open;
                  const height = ((candle.high - candle.low) / priceRange) * 100;
                  const bodyHeight = Math.abs(candle.close - candle.open) / priceRange * 100;
                  const bottom = ((candle.low - minPrice) / priceRange) * 100;

                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center justify-end"
                      style={{ height: '100%', width: '8px' }}
                    >
                      {/* Wick */}
                      <div
                        className={`w-px ${isGreen ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{
                          height: `${Math.max(height, 2)}%`,
                          position: 'absolute',
                          bottom: `${bottom}%`,
                        }}
                      />
                      {/* Body */}
                      <div
                        className={`w-full ${isGreen ? 'bg-emerald-500' : 'bg-red-500'} rounded-sm`}
                        style={{
                          height: `${Math.max(bodyHeight, 1)}%`,
                          position: 'absolute',
                          bottom: `${((Math.min(candle.open, candle.close) - minPrice) / priceRange) * 100}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price info */}
            <div className="flex justify-between text-xs text-primary/50 font-mono mt-2">
              <span>High: ${maxPrice.toFixed(6)}</span>
              <span>Low: ${minPrice.toFixed(6)}</span>
              <span>Candles: {candles.length}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
