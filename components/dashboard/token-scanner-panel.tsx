'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/hooks/useAgentStore';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export function TokenScannerPanel() {
  const { tokenList, isScanning, selectToken, selectedMint } = useAgentStore();

  // Initial scan on mount
  useEffect(() => {
    if (tokenList.length === 0 && !isScanning) {
      // Trigger initial scan via the agent
    }
  }, [tokenList.length, isScanning]);

  return (
    <Card className="border-primary/20 bg-black/80 backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="p-4 pb-2 border-b border-primary/10 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-mono flex items-center gap-2 text-primary">
          <Activity className="h-4 w-4" />
          TOKEN_SCANNER
        </CardTitle>
        {isScanning && (
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 animate-pulse">
            SCANNING...
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="divide-y divide-primary/5">
            {tokenList.length === 0 ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 bg-primary/5" />
                ))}
              </div>
            ) : (
              tokenList.slice(0, 20).map((token, index) => (
                <motion.div
                  key={token.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => selectToken(token.address)}
                  className={cn(
                    'p-4 cursor-pointer transition-all duration-200 group',
                    selectedMint === token.address
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-primary/5 border-l-2 border-transparent'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-primary text-sm">{token.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">{token.name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm text-primary">${token.price.toFixed(6)}</div>
                      <div className={cn(
                        'text-xs font-mono flex items-center gap-1',
                        token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {token.priceChange24h >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Vol: ${(token.volume24h / 1000000).toFixed(2)}M
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Liq: ${(token.liquidity / 1000).toFixed(1)}K
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
