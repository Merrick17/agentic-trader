'use client';

import { useTrades } from '@/hooks/use-trades';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { History, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade } from '@/types/trade';

export function RecentTradesTable() {
  const { trades, isLoading, error } = useTrades({ limit: 5 });

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-destructive">Failed to load trades</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-foreground">
          <History className="h-4 w-4 text-primary" />
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-elevated" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ArrowRightLeft className="h-10 w-10 text-border mb-3" />
            <p className="text-sm text-muted-foreground">No trades executed yet</p>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-xs">
              The trading agent will execute trades here based on signals
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Token</TableHead>
                <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Side</TableHead>
                <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right">Price</TableHead>
                <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade: Trade) => (
                <TableRow
                  key={trade.id}
                  className="border-border hover:bg-elevated transition-colors"
                >
                  <TableCell className="font-medium text-foreground">{trade.tokenSymbol}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs font-medium',
                        trade.side === 'buy' ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {trade.side?.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-foreground">
                    {trade.amount?.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-foreground">
                    ${trade.price?.toFixed(6)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[10px] text-muted-foreground">{trade.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
