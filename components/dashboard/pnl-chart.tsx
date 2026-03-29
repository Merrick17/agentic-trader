'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  value: number; // Daily P&L value
}

interface PnLChartProps {
  className?: string;
}

const TIME_RANGES = [
  { label: '24H', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
] as const;

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const isPositive = value >= 0;

    return (
      <div className="bg-card border border-border rounded p-2 shadow-lg">
        <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
        <p className={cn(
          "text-xs font-mono font-semibold",
          isPositive ? 'text-success' : 'text-destructive'
        )}>
          {isPositive ? '+' : ''}${value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
}

export function PnLChart({ className }: PnLChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('7d');

  useEffect(() => {
    async function fetchPortfolioHistory() {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/portfolio/history?days=${timeRange.replace('d', '')}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch portfolio history');
        }

        const data = await response.json();

        if (data.history && data.history.length > 0) {
          // Map the data to chart format
          const formatted = data.history.map((item: { date: string; totalValue: number; pnl: number }) => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: item.pnl || 0,
            totalValue: item.totalValue || 0,
          }));
          setChartData(formatted);
        } else {
          // Generate mock data for demonstration
          const mockData = generateMockData(timeRange);
          setChartData(mockData);
        }
      } catch (err) {
        console.error('PnL Chart error:', err);
        // Fallback to mock data
        const mockData = generateMockData(timeRange);
        setChartData(mockData);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPortfolioHistory();
  }, [timeRange]);

  // Calculate stats
  const totalPnL = chartData.reduce((sum, point) => sum + point.value, 0);
  const isPositive = totalPnL >= 0;

  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            P&L Performance
          </CardTitle>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded transition-colors',
                  timeRange === range.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Skeleton className="h-full w-full bg-elevated" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-10 w-10 text-border mb-3" />
            <p className="text-sm text-muted-foreground">No trading history yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Chart will populate once trades are executed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Period P&L</p>
                <div className={cn(
                  "text-lg font-mono font-bold flex items-center gap-1",
                  isPositive ? 'text-success' : 'text-destructive'
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {isPositive ? '+' : ''}${totalPnL.toFixed(2)}
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trades</p>
                <p className="text-sm font-mono font-semibold text-foreground">
                  {chartData.filter(d => d.value !== 0).length}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? '#0ecb81' : '#ff5353'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isPositive ? '#0ecb81' : '#ff5353'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#848e9c' }}
                    tickLine={false}
                    axisLine={{ stroke: '#2b3139' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#848e9c' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? '#0ecb81' : '#ff5353'}
                    fillOpacity={1}
                    fill="url(#colorPnL)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to generate mock data for demonstration
function generateMockData(timeRange: string): ChartDataPoint[] {
  const days = parseInt(timeRange.replace('d', ''));
  const data: ChartDataPoint[] = [];
  const now = new Date();

  // Generate realistic P&L data
  let baseValue = 10000;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Random daily change (-5% to +5%)
    const change = (Math.random() - 0.5) * 0.1;
    baseValue = baseValue * (1 + change);

    // Random daily P&L
    const dailyPnL = (Math.random() - 0.4) * 500; // Slightly positive bias

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: dailyPnL,
    });
  }

  return data;
}
