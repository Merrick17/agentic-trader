'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Signal, SignalFilter } from '@/types/signal';

interface UseSignalsOptions {
  filter?: SignalFilter;
  limit?: number;
  pollInterval?: number;
}

interface UseSignalsReturn {
  signals: Signal[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSignals(options: UseSignalsOptions = {}): UseSignalsReturn {
  const { filter, limit = 20, pollInterval = 30000 } = options;
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (filter?.minConfidence) params.append('minConfidence', filter.minConfidence.toString());
      if (filter?.minLiquidity) params.append('minLiquidity', filter.minLiquidity.toString());

      const response = await fetch(`/api/signals?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch signals: ${response.statusText}`);
      }

      const data = await response.json();
      setSignals(data.signals || []);
    } catch (err) {
      console.error('useSignals error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => {
    fetchSignals();

    // Poll for updates
    const interval = setInterval(fetchSignals, pollInterval);
    return () => clearInterval(interval);
  }, [fetchSignals, pollInterval]);

  return { signals, isLoading, error, refetch: fetchSignals };
}
