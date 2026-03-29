'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/hooks/useAgentStore';
import { Trophy, TrendingUp, Users, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export function TraderPanel() {
  const { topTraders, selectedMint, tokenList } = useAgentStore();

  const selectedToken = tokenList.find((t) => t.address === selectedMint);

  // Fetch top traders when selected token changes
  useEffect(() => {
    if (!selectedMint) return;

    const fetchTraders = async () => {
      try {
        const res = await fetch(`/api/data/top-traders?mint=${selectedMint}`);
        if (res.ok) {
          await res.json();
          // Traders would be set via the store
        }
      } catch (error) {
        console.error('Error fetching traders:', error);
      }
    };

    fetchTraders();
  }, [selectedMint]);

  const getStrategyColor = (strategy?: string) => {
    switch (strategy) {
      case 'SCALPER':
        return 'text-yellow-400 border-yellow-500/30';
      case 'SWING':
        return 'text-blue-400 border-blue-500/30';
      case 'ACCUMULATOR':
        return 'text-emerald-400 border-emerald-500/30';
      case 'WHALE_DUMP':
        return 'text-red-400 border-red-500/30';
      default:
        return 'text-muted-foreground border-muted';
    }
  };

  return (
    <Card className="border-primary/20 bg-black/80 backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="p-4 pb-2 border-b border-primary/10 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-mono flex items-center gap-2 text-primary">
          <Trophy className="h-4 w-4" />
          TOP_TRADERS
        </CardTitle>
        {selectedToken && (
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
            {selectedToken.symbol}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="divide-y divide-primary/5">
            {topTraders.length === 0 ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 bg-primary/5" />
                ))}
              </div>
            ) : (
              topTraders.map((trader, index) => (
                <motion.div
                  key={trader.wallet}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-primary/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        {index < 3 && (
                          <div className="absolute -top-1 -right-1">
                            {index === 0 && <span className="text-xs">🥇</span>}
                            {index === 1 && <span className="text-xs">🥈</span>}
                            {index === 2 && <span className="text-xs">🥉</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-primary text-sm">
                          {trader.wallet.slice(0, 4)}...{trader.wallet.slice(-4)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {trader.tradeCount} trades
                          </span>
                          <span>•</span>
                          <span className={trader.buyRatio > 0.5 ? 'text-emerald-400' : 'text-red-400'}>
                            {(trader.buyRatio * 100).toFixed(0)}% buys
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm text-primary">
                        ${(trader.volume24h / 1000).toFixed(1)}K
                      </div>
                      {trader.estimatedPnl !== undefined && (
                        <div className={cn(
                          'text-xs font-mono',
                          trader.estimatedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {trader.estimatedPnl >= 0 ? '+' : ''}${trader.estimatedPnl.toFixed(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {trader.strategy && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', getStrategyColor(trader.strategy))}
                      >
                        {trader.strategy}
                      </Badge>
                      {trader.strategyConfidence && (
                        <span className="text-[10px] text-muted-foreground">
                          {trader.strategyConfidence} confidence
                        </span>
                      )}
                    </div>
                  )}

                  {trader.tags && trader.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {trader.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[9px] border-primary/20 text-primary/70"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
