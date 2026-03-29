'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentStatus {
  isRunning: boolean;
  isEnabled: boolean;
  lastScanAt: string | null;
  totalScans: number;
  totalTrades: number;
  activeTrades: number;
  currentWallet: string | null;
}

interface Trade {
  id: string;
  tokenAddress: string;
  side: 'buy' | 'sell';
  amountUsd: number;
  entryPrice: number;
  status: 'pending' | 'executed' | 'failed';
  confidence: number;
  createdAt: string;
}

interface Performance {
  totalScans: number;
  totalTrades: number;
  activeTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlUsd: number;
  avgWin: number;
  avgLoss: number;
}

interface AgentData {
  status: AgentStatus;
  activeTrades: Trade[];
  performance: Performance | null;
  config: Record<string, number | boolean>;
}

export function AutonomousAgentPanel() {
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/autonomous');
      if (!res.ok) throw new Error('Failed to fetch agent status');
      setData(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await fetch('/api/autonomous', { method: 'POST' });
      } else {
        await fetch('/api/autonomous', { method: 'DELETE' });
      }
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autonomous Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Agent Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchData} variant="outline" className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { status, activeTrades, performance, config } = data!;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Autonomous Trading Agent</span>
            <div className="flex items-center gap-2">
              <Badge variant={status.isRunning ? 'default' : 'secondary'}>
                {status.isRunning ? 'RUNNING' : 'STOPPED'}
              </Badge>
              {!config.autoTradingEnabled && (
                <Badge variant="destructive">DISABLED</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Autonomous Trading</Label>
              <p className="text-xs text-muted-foreground">
                Agent will scan markets and execute trades automatically
              </p>
            </div>
            <Switch
              checked={status.isRunning}
              onCheckedChange={handleToggle}
              disabled={!config.autoTradingEnabled}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Scans</p>
              <p className="text-2xl font-mono font-bold">{status.totalScans}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-mono font-bold">{status.totalTrades}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Trades</p>
              <p className="text-2xl font-mono font-bold">{status.activeTrades}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Scan</p>
              <p className="text-xs font-mono">
                {status.lastScanAt
                  ? new Date(status.lastScanAt).toLocaleTimeString()
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Performance */}
          {performance && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className={`text-xl font-mono font-bold ${performance.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                    {performance.winRate}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">P&L</p>
                  <p className={`text-xl font-mono font-bold ${performance.totalPnlUsd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${performance.totalPnlUsd.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Closed</p>
                  <p className="text-xl font-mono font-bold">{performance.closedTrades}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {activeTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-2 border rounded bg-muted/30"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={trade.side === 'buy' ? 'default' : 'destructive'}
                          className="text-[10px]"
                        >
                          {trade.side.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-sm">{trade.tokenAddress.slice(0, 8)}...</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${trade.amountUsd} @ ${trade.entryPrice} | Confidence: {trade.confidence}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {trade.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scan Interval</span>
              <span className="font-mono">{(config.scanIntervalMs as number) / 1000}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Confidence</span>
              <span className="font-mono">{config.minConfidenceScore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Trade</span>
              <span className="font-mono">${config.maxTradeAmountUsd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Concurrent</span>
              <span className="font-mono">{config.maxConcurrentTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Liquidity</span>
              <span className="font-mono">${config.minLiquidityUsd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Volume 24h</span>
              <span className="font-mono">${config.minVolume24hUsd}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
