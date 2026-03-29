"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  Terminal,
  Cpu,
  Binary,
} from "lucide-react";
import { SettingsDialog } from "@/components/dashboard/settings-dialog";
import { useMarketData } from "@/hooks/use-market-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// Rendered only on the client — avoids server/client timestamp hydration mismatch
function ClientClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString()),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  if (!time) return null;
  return <>{time}</>;
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  } else if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toString();
}

function TickerItem({
  token,
}: {
  token: {
    symbol: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
  };
}) {
  const isPositive = token.priceChange24h >= 0;
  const symbol = token.symbol.replace("/USD", "");

  return (
    <div className="flex items-center gap-3 px-4 border-r border-primary/20 last:border-r-0 whitespace-nowrap font-mono">
      <span className="text-xs font-bold text-primary">{symbol}</span>
      <span className="text-xs tabular-nums text-primary/80">
        {formatPrice(token.price)}
      </span>
      <div
        className={cn(
          "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-mono",
          isPositive
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-destructive/10 text-destructive border-destructive/30",
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-2.5 w-2.5" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5" />
        )}
        {isPositive ? "+" : ""}
        {token.priceChange24h.toFixed(1)}%
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        Vol: ${formatVolume(token.volume24h)}
      </span>
    </div>
  );
}

function TickerSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 border-r border-primary/20">
      <Skeleton className="h-3 w-10 bg-primary/5" />
      <Skeleton className="h-3 w-16 bg-primary/5" />
      <Skeleton className="h-3 w-12 bg-primary/5" />
    </div>
  );
}

export function Topbar() {
  const { tokens, isLoading } = useMarketData(20000);
  const displayTokens = tokens.length > 0 ? [...tokens, ...tokens] : [];
  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-black/90 backdrop-blur-xl font-mono">
      {/* Market Ticker */}
      <div className="h-9 bg-black/60 border-b border-primary/20 overflow-hidden">
        <div className="flex items-center h-full">
          {/* Terminal Label */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-4 border-r border-primary/20 h-full bg-gradient-to-r from-primary/10 to-transparent shrink-0 z-10"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-md opacity-30" />
              <Binary className="relative h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              MARKET_DATA
            </span>
          </motion.div>

          {/* Scrolling Ticker */}
          <div className="flex-1 overflow-hidden relative">
            <div className="flex animate-marquee">
              {isLoading ? (
                <div className="flex items-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TickerSkeleton key={i} />
                  ))}
                </div>
              ) : displayTokens.length > 0 ? (
                <div className="flex items-center">
                  {displayTokens.map((token, i) => (
                    <TickerItem key={`${token.symbol}-${i}`} token={token} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center px-4 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Connecting to DexScreener...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 px-4 border-l border-primary/20 h-full bg-gradient-to-l from-primary/10 to-transparent shrink-0">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full animate-pulse",
                  tokens.length > 0
                    ? "bg-primary shadow-[0_0_8px_rgba(0,255,65,0.8)]"
                    : "bg-amber-500",
                )}
              />
              <span className="text-[10px] font-medium text-muted-foreground uppercase hidden sm:block font-mono">
                {tokens.length > 0 ? "LIVE" : "SYNCING"}
              </span>
            </div>

            <div className="h-4 w-px bg-primary/20" />

            {/* Token Count */}
            {!isLoading && tokens.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground font-mono">
                  {tokens.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex h-8 items-center justify-between px-4 bg-black/40 border-b border-primary/10">
        <div className="flex items-center gap-6">
          {/* Agent Status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-sm opacity-30 animate-pulse" />
              <Cpu className="relative h-3 w-3 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Agent:
            </span>
            <span className="text-[10px] text-primary font-mono">ONLINE</span>
          </div>

          <div className="h-3 w-px bg-primary/20" />

          {/* Signals */}
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary/70" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Signals:
            </span>
            <span className="text-[10px] text-primary font-mono">0</span>
          </div>

          <div className="h-3 w-px bg-primary/20 hidden sm:block" />

          {/* P&L */}
          <div className="hidden sm:flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-primary/70" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              P&L:
            </span>
            <span className="text-[10px] text-primary font-mono">$0.00</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Settings Dialog */}
          <SettingsDialog />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-7 w-7 text-primary/70 hover:text-primary hover:bg-primary/10"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(0,255,65,0.8)]" />
          </Button>

          <div className="h-4 w-px bg-primary/20" />

          {/* Wallet Display */}
          <WalletDisplay />

          {/* Time — client-only to avoid hydration mismatch */}
          <div className="text-[10px] text-muted-foreground font-mono hidden sm:block">
            <ClientClock />
          </div>
        </div>
      </div>
    </header>
  );
}

function WalletDisplay() {
  const { publicKey, disconnect } = useWallet();
  const router = useRouter();

  const handleDisconnect = async () => {
    await disconnect();
    document.cookie =
      "matrix_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/sign-in");
  };

  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded border border-primary/30 bg-black flex items-center justify-center">
        <span className="text-[8px] text-primary">SOL</span>
      </div>
      {publicKey && (
        <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </span>
      )}
    </div>
  );
}
