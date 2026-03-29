'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FloatingAgent } from '@/components/agent/floating-agent';
import {
  Terminal,
  Activity,
  TrendingUp,
  Wallet,
  Radio,
  Zap,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BarChart3,
  Target,
  Cpu,
  Shield,
  Binary,
  Code,
} from 'lucide-react';
import type { Signal } from '@/types/signal';
import type { Trade } from '@/types/trade';

interface DashboardStats {
  portfolioValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  activePositions: number;
  signalsToday: number;
  winRate: number | null;
}

// Matrix Rain Background Component
function MatrixRain() {
  const [drops, setDrops] = useState<Array<{ id: number; x: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const newDrops = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    }));
    setDrops(newDrops);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {drops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute text-[10px] font-mono text-primary/20 whitespace-nowrap"
          style={{ left: `${drop.x}%` }}
          initial={{ y: -100, opacity: 0 }}
          animate={{
            y: ['0%', '100vh'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: drop.duration,
            delay: drop.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ opacity: 1 - i * 0.1 }}>
              {String.fromCharCode(0x30A0 + Math.random() * 96)}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

export default function MatrixTerminal() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agentLogs, setAgentLogs] = useState<string[]>([
    '[SYSTEM] Matrix trading protocol initialized',
    '[SYSTEM] Connecting to Solana neural network...',
    '[SYSTEM] Portfolio sync: COMPLETE',
    '[SYSTEM] Autonomous mode: STANDBY',
  ]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Clock - client-side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [portfolioRes, signalsRes, tradesRes, autonomousRes] = await Promise.all([
          fetch('/api/portfolio'),
          fetch('/api/signals'),
          fetch('/api/trades'),
          fetch('/api/autonomous'),
        ]);

        if (portfolioRes.ok) {
          const portfolio = await portfolioRes.json();
          setStats({
            portfolioValue: portfolio.totalValue || 0,
            totalPnL: portfolio.totalUnrealizedPnL || 0,
            totalPnLPercentage: portfolio.totalPnLPercentage || 0,
            activePositions: portfolio.positions?.length || 0,
            signalsToday: 0,
            winRate: null,
          });
        }

        if (signalsRes.ok) {
          const signalsData = await signalsRes.json();
          setSignals((signalsData.signals || []).slice(0, 5));
        }

        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          setTrades((tradesData.trades || []).slice(0, 5));
        }

        if (autonomousRes.ok) {
          const autoData = await autonomousRes.json();
          if (autoData.status?.isRunning) {
            setAgentLogs((prev) => [
              ...prev.slice(-4),
              '[AUTONOMOUS] Trading loop active - scanning markets...',
            ]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    const logInterval = setInterval(() => {
      const newLogs = [
        `[${new Date().toLocaleTimeString()}] Scanning DEX markets...`,
        `[${new Date().toLocaleTimeString()}] Analyzing price action...`,
        `[${new Date().toLocaleTimeString()}] RAG pattern matching...`,
        `[${new Date().toLocaleTimeString()}] Neural inference complete`,
      ];
      setAgentLogs((prev) => [...prev.slice(-20), newLogs[Math.floor(Math.random() * newLogs.length)]]);
    }, 15000);

    return () => clearInterval(logInterval);
  }, []);

  const StatBlock = ({ label, value, change, icon: Icon, suffix = '' }: {
    label: string;
    value: string | number;
    change?: number;
    icon: React.ElementType;
    suffix?: string;
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative overflow-hidden rounded border border-primary/20 bg-black/60 backdrop-blur-sm',
          'hover:border-primary/40 transition-all duration-300 group'
        )}
      >
        {/* Matrix scanline effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative flex items-center gap-4 p-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-xl opacity-20" />
            <div className="relative h-10 w-10 rounded bg-black/80 border border-primary/30 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
              {label}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-mono font-bold text-primary tracking-tight text-glow">
                {value}{suffix}
              </span>
              {change !== undefined && (
                <span className={cn(
                  'text-xs font-mono px-1.5 py-0.5 rounded border',
                  change >= 0
                    ? 'border-primary/30 text-primary bg-primary/10'
                    : 'border-destructive/30 text-destructive bg-destructive/10'
                )}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 relative">
      <MatrixRain />

      {/* Terminal Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded border border-primary/30 bg-black/80 backdrop-blur-xl"
      >
        {/* Animated border scan */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-xl opacity-30 animate-pulse" />
              <div className="relative h-10 w-10 rounded bg-black border border-primary/50 flex items-center justify-center">
                <Binary className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div>
              <h1 className="text-lg font-mono font-bold tracking-wider text-primary flex items-center gap-3 text-glow">
                <span className="text-primary/70">{'>'}</span>
                MATRIX_TRADER
                <span className={cn("text-primary", cursorVisible ? 'opacity-100' : 'opacity-0')}>_</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                v2.0.4 // Solana_DEX_Neural_Network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-mono text-primary uppercase tracking-wider">ONLINE</span>
            </div>

            <div className="h-8 w-px bg-primary/30" />

            <div className="text-xs font-mono text-muted-foreground">
              {currentTime || '--:--:--'}<span className="text-primary animate-pulse">_</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Column - Stats & Agent */}
        <div className="space-y-4">
          {/* Stats Grid */}
          {isLoading ? (
            <>
              <Skeleton className="h-20 rounded bg-primary/5" />
              <Skeleton className="h-20 rounded bg-primary/5" />
              <Skeleton className="h-20 rounded bg-primary/5" />
            </>
          ) : (
            <>
              <StatBlock
                label="PORTFOLIO_VALUE"
                value={`$${(stats?.portfolioValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                change={stats?.totalPnLPercentage}
                icon={DollarSign}
              />
              <StatBlock
                label="TOTAL_PnL"
                value={(stats?.totalPnL ?? 0) >= 0 ? '+' : '-'}
                change={stats?.totalPnLPercentage}
                icon={TrendingUp}
                suffix={`$${Math.abs(stats?.totalPnL || 0).toFixed(2)}`}
              />
              <StatBlock
                label="ACTIVE_POSITIONS"
                value={stats?.activePositions || 0}
                icon={Wallet}
              />
            </>
          )}

          {/* Agent Neural Core */}
          <Card className="border-primary/20 bg-black/80 backdrop-blur-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-primary/10">
              <CardTitle className="text-xs font-mono flex items-center gap-2 text-primary">
                <Cpu className="h-4 w-4" />
                NEURAL_CORE
                <span className="text-[10px] text-muted-foreground ml-auto">PID: 0x4A3F</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ScrollArea className="h-40 rounded bg-black border border-primary/10 p-3 font-mono text-[10px]">
                {agentLogs.map((log, i) => (
                  <div key={i} className="flex gap-2 text-primary/70">
                    <span className="text-primary/40">{'>'}</span>
                    <span>{log}</span>
                    {i === agentLogs.length - 1 && (
                      <span className={cn("text-primary", cursorVisible ? 'opacity-100' : 'opacity-0')}>_</span>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Terminal Display */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-fit bg-black/60 border border-primary/20 backdrop-blur-sm font-mono">
              <TabsTrigger
                value="overview"
                className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 border border-transparent"
              >
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                overview.exe
              </TabsTrigger>
              <TabsTrigger
                value="signals"
                className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 border border-transparent"
              >
                <Radio className="h-3.5 w-3.5 mr-1.5" />
                signals.dat
              </TabsTrigger>
              <TabsTrigger
                value="trades"
                className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 border border-transparent"
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                trades.log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 mt-4 space-y-4">
              {/* Live Feed */}
              <Card className="border-primary/20 bg-black/80 backdrop-blur-xl">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-primary/10">
                  <CardTitle className="text-xs font-mono flex items-center gap-2 text-primary">
                    <Zap className="h-4 w-4" />
                    LIVE_SIGNAL_STREAM
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-primary/30 text-primary bg-primary/10 font-mono"
                  >
                    {signals.length} ACTIVE
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="h-56">
                    {signals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="relative mb-4">
                          <div className="absolute inset-0 bg-primary blur-xl opacity-20" />
                          <Radio className="relative h-12 w-12 text-primary/30" />
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">[NO_SIGNALS_DETECTED]</p>
                        <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
                          Neural agent scanning markets...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {signals.map((signal) => (
                          <SignalRow key={signal.id} signal={signal} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Activity Stream */}
              <Card className="border-primary/20 bg-black/80 backdrop-blur-xl">
                <CardHeader className="p-4 pb-2 border-b border-primary/10">
                  <CardTitle className="text-xs font-mono flex items-center gap-2 text-primary">
                    <Clock className="h-4 w-4" />
                    EXECUTION_LOG
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="h-32">
                    {trades.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-6">
                        <Code className="h-8 w-8 text-primary/20 mb-2" />
                        <p className="text-xs text-muted-foreground font-mono">[NO_EXECUTIONS]</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {trades.map((trade) => (
                          <TradeRow key={trade.id} trade={trade} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signals" className="flex-1 mt-4">
              <Card className="border-primary/20 bg-black/80 backdrop-blur-xl h-full">
                <CardHeader className="p-4 pb-2 border-b border-primary/10">
                  <CardTitle className="text-xs font-mono text-primary">SIGNAL_MATRIX</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="h-96">
                    {signals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <AlertTriangle className="h-12 w-12 text-primary/30 mb-4" />
                        <p className="text-sm text-muted-foreground font-mono">[NO_SIGNALS_GENERATED]</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {signals.map((signal) => (
                          <SignalRow key={signal.id} signal={signal} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trades" className="flex-1 mt-4">
              <Card className="border-primary/20 bg-black/80 backdrop-blur-xl h-full">
                <CardHeader className="p-4 pb-2 border-b border-primary/10">
                  <CardTitle className="text-xs font-mono text-primary">EXECUTION_HISTORY</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="h-96">
                    {trades.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <AlertTriangle className="h-12 w-12 text-primary/30 mb-4" />
                        <p className="text-sm text-muted-foreground font-mono">[NO_TRADES_EXECUTED]</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {trades.map((trade) => (
                          <TradeRow key={trade.id} trade={trade} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <FloatingAgent />
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group relative overflow-hidden rounded border border-primary/10 bg-black/40 p-3 hover:border-primary/30 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-2 w-2 rounded-full',
            signal.sentiment === 'bullish' && 'bg-primary shadow-[0_0_8px_rgba(0,255,65,0.8)]',
            signal.sentiment === 'bearish' && 'bg-destructive shadow-[0_0_8px_rgba(255,51,51,0.8)]',
            signal.sentiment === 'neutral' && 'bg-muted-foreground'
          )} />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary text-sm">{signal.tokenSymbol}</span>
              <span className="text-xs text-muted-foreground">{signal.tokenName}</span>
            </div>
            <div className="text-xs font-mono text-primary/70">
              ${signal.price.toFixed(6)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-mono border',
              signal.confidence >= 80
                ? 'border-primary/50 text-primary bg-primary/10'
                : signal.confidence >= 60
                ? 'border-primary/30 text-primary/70 bg-primary/5'
                : 'border-muted-foreground/30 text-muted-foreground'
            )}
          >
            {signal.confidence}/100
          </Badge>
          <div className="text-[10px] text-muted-foreground mt-1 font-mono">
            {new Date(signal.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between py-2 px-3 border-b border-primary/5 last:border-0 font-mono"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-8 w-8 rounded flex items-center justify-center text-xs font-bold',
          trade.side === 'buy'
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'bg-destructive/20 text-destructive border border-destructive/30'
        )}>
          {trade.side === 'buy' ? 'BUY' : 'SELL'}
        </div>

        <div>
          <div className="font-semibold text-primary text-sm">{trade.tokenSymbol}</div>
          <div className="text-xs text-muted-foreground">
            {trade.amount.toFixed(4)}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-sm text-primary">
          ${trade.totalValue.toFixed(2)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {new Date(trade.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
}
