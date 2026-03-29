'use client';

import { useSignals } from '@/hooks/use-signals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Signal } from '@/types/signal';

function SignalItem({ signal }: { signal: Signal }) {
  const sentimentIcon = {
    bullish: TrendingUp,
    bearish: TrendingDown,
    neutral: Minus,
  };

  const sentimentColor = {
    bullish: 'text-success bg-success/10 border-success/20',
    bearish: 'text-destructive bg-destructive/10 border-destructive/20',
    neutral: 'text-primary bg-primary/10 border-primary/20',
  };

  const Icon = sentimentIcon[signal.sentiment || 'neutral'];

  return (
    <div
      className="flex items-center justify-between rounded bg-elevated p-3 hover:bg-elevated/80 transition-colors cursor-pointer group"
      onClick={() => {
        if (signal.metadata?.pairAddress) {
          window.open(`https://dexscreener.com/solana/${signal.metadata.pairAddress}`, '_blank');
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded border', sentimentColor[signal.sentiment || 'neutral'])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="font-medium text-sm text-foreground">{signal.tokenSymbol}</div>
          <div className="text-[10px] text-muted-foreground">{signal.tokenName}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-mono tabular-nums text-foreground">
            ${signal.price?.toFixed(6) || '0.000000'}
          </div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] h-4 px-1 font-mono tabular-nums',
                signal.confidence >= 80
                  ? 'border-success/50 text-success'
                  : signal.confidence >= 60
                  ? 'border-primary/50 text-primary'
                  : 'border-destructive/50 text-destructive'
              )}
            >
              {signal.confidence}%
            </Badge>
            {signal.priceChange24h !== 0 && (
              <span className={cn(
                'text-[10px] font-mono tabular-nums',
                (signal.priceChange24h || 0) >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {(signal.priceChange24h || 0) >= 0 ? '+' : ''}{signal.priceChange24h?.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export function LiveSignalFeed() {
  const { signals, isLoading, error } = useSignals({ limit: 20 });

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-foreground">
            <Radio className="h-4 w-4 text-primary" />
            Live Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-destructive">
            Error loading signals. API may be rate limited.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm text-foreground">
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Live Signals
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-live" />
            <span className="text-[10px] font-medium text-success uppercase">DexScreener</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px]">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-elevated" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-xs py-8 gap-2">
              <Radio className="h-8 w-8 opacity-30" />
              <p>No signals detected</p>
              <p className="text-[10px]">Scanning Solana DEX...</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {signals.map((signal: Signal) => (
                <SignalItem key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
