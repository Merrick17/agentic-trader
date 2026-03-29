'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity, DollarSign, Wallet, Percent } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: 'activity' | 'dollar' | 'wallet' | 'percent';
  className?: string;
}

const iconMap = {
  activity: Activity,
  dollar: DollarSign,
  wallet: Wallet,
  percent: Percent,
};

export function StatsCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
}: StatsCardProps) {
  const Icon = iconMap[icon];

  return (
    <Card className={cn('bg-card border-border card-hover', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="rounded bg-elevated p-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold text-foreground font-mono tabular-nums tracking-tight">
          {value}
        </div>
        {(description || trend) && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {trend && (
              <span
                className={cn(
                  'mr-1 inline-flex items-center gap-0.5 font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value).toFixed(2)}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
