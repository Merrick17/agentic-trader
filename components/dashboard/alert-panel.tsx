'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/hooks/useAgentStore';
import { Bell, TrendingUp, Users, Sparkles, Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const alertIcons: Record<string, typeof TrendingUp> = {
  VOLUME_SURGE: TrendingUp,
  WHALE_BUY: Users,
  WHALE_SELL: Users,
  NEW_LISTING: Sparkles,
  SMART_MONEY_ENTRY: Users,
  RUG_RISK: Shield,
};

const alertColors: Record<string, string> = {
  VOLUME_SURGE: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  WHALE_BUY: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  WHALE_SELL: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  NEW_LISTING: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  SMART_MONEY_ENTRY: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  RUG_RISK: 'text-red-400 border-red-500/30 bg-red-500/10',
};

export function AlertPanel() {
  const { alerts, removeAlert, clearAlerts } = useAgentStore();

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className="border-primary/20 bg-black/80 backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="p-4 pb-2 border-b border-primary/10 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-mono flex items-center gap-2 text-primary">
          <Bell className="h-4 w-4" />
          ALERT_FEED
          {alerts.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        {alerts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
            onClick={clearAlerts}
          >
            CLEAR
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="divide-y divide-primary/5">
            <AnimatePresence>
              {alerts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-32 text-center p-4"
                >
                  <div className="relative mb-2">
                    <div className="absolute inset-0 bg-primary blur-xl opacity-20" />
                    <Bell className="relative h-8 w-8 text-primary/30" />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">[NO_ALERTS]</p>
                </motion.div>
              ) : (
                alerts.map((alert, index) => {
                  const Icon = alertIcons[alert.type] || Bell;
                  const colorClass = alertColors[alert.type] || 'text-muted-foreground border-muted';

                  return (
                    <motion.div
                      key={alert.ts + index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-3 hover:bg-primary/5 transition-colors group relative"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded border', colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary text-sm">{alert.symbol}</span>
                            <Badge variant="outline" className={cn('text-[9px]', colorClass)}>
                              {alert.type}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.message || getDefaultMessage(alert)}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground/50">
                              {formatTime(alert.ts)}
                            </span>
                            {alert.multiplier && (
                              <span className="text-[10px] text-emerald-400">
                                {alert.multiplier.toFixed(1)}x
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                          onClick={() => removeAlert(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function getDefaultMessage(alert: { type: string; symbol: string; multiplier?: number }): string {
  switch (alert.type) {
    case 'VOLUME_SURGE':
      return `Volume spike detected${alert.multiplier ? ` (${alert.multiplier.toFixed(1)}x average)` : ''}`;
    case 'WHALE_BUY':
      return 'Large buy order detected';
    case 'WHALE_SELL':
      return 'Large sell order detected';
    case 'NEW_LISTING':
      return 'New token listed on DEX';
    case 'SMART_MONEY_ENTRY':
      return 'Smart money wallet accumulating';
    case 'RUG_RISK':
      return 'Potential risk indicators detected';
    default:
      return 'Market activity detected';
  }
}
