/**
 * Zustand store for agent state management
 * Handles tokens, traders, alerts, OHLCV data, and UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Token = {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders?: number;
};

export type Trader = {
  wallet: string;
  volume24h: number;
  tradeCount: number;
  buyRatio: number;
  estimatedPnl?: number;
  strategy?: 'SCALPER' | 'SWING' | 'ACCUMULATOR' | 'WHALE_DUMP';
  strategyConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  tags?: string[];
};

export type OHLCVCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Alert = {
  type: 'VOLUME_SURGE' | 'WHALE_BUY' | 'WHALE_SELL' | 'NEW_LISTING' | 'SMART_MONEY_ENTRY' | 'RUG_RISK';
  mint: string;
  symbol: string;
  multiplier?: number;
  message?: string;
  ts: number;
};

export type SwapQuote = {
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: unknown[];
  slippageBps: number;
};

export type Signal = {
  verdict: 'BUY' | 'WATCH' | 'AVOID';
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type AgentStore = {
  // Data
  tokenList: Token[];
  topTraders: Trader[];
  ohlcvData: OHLCVCandle[];
  alerts: Alert[];
  selectedMint: string | null;

  // UI State
  isScanning: boolean;
  lastScanAt: number | null;
  activeTab: 'scanner' | 'traders' | 'alerts' | 'chart';

  // Actions
  setTokenList: (tokens: Token[]) => void;
  setTopTraders: (traders: Trader[]) => void;
  setOHLCV: (candles: OHLCVCandle[]) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (index: number) => void;
  selectToken: (mint: string | null) => void;
  setScanning: (scanning: boolean) => void;
  setActiveTab: (tab: AgentStore['activeTab']) => void;
  clearAlerts: () => void;
};

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tokenList: [],
      topTraders: [],
      ohlcvData: [],
      alerts: [],
      selectedMint: null,
      isScanning: false,
      lastScanAt: null,
      activeTab: 'scanner',

      // Actions
      setTokenList: (tokenList) => set({ tokenList, lastScanAt: Date.now() }),

      setTopTraders: (topTraders) => set({ topTraders }),

      setOHLCV: (ohlcvData) => set({ ohlcvData }),

      addAlert: (alert) => set((state) => ({
        alerts: [alert, ...state.alerts].slice(0, 100), // Keep last 100 alerts
      })),

      removeAlert: (index) => set((state) => ({
        alerts: state.alerts.filter((_, i) => i !== index),
      })),

      selectToken: (selectedMint) => set({ selectedMint }),

      setScanning: (isScanning) => set({ isScanning }),

      setActiveTab: (activeTab) => set({ activeTab }),

      clearAlerts: () => set({ alerts: [] }),
    }),
    {
      name: 'agent-store',
      partialize: (state) => ({
        selectedMint: state.selectedMint,
        activeTab: state.activeTab,
      }),
    }
  )
);

// Selectors
export const selectTokensByVolume = (state: AgentStore) =>
  [...state.tokenList].sort((a, b) => b.volume24h - a.volume24h);

export const selectBullishTokens = (state: AgentStore) =>
  state.tokenList.filter((t) => t.priceChange24h > 5);

export const selectHighLiquidityTokens = (state: AgentStore, minLiquidity = 50000) =>
  state.tokenList.filter((t) => t.liquidity >= minLiquidity);
