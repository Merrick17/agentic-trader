'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Binary, ChevronRight, Wallet } from 'lucide-react';

interface WalletButtonProps {
  onConnect?: (walletAddress: string) => void;
  className?: string;
}

export function MatrixWalletButton({ onConnect, className }: WalletButtonProps) {
  const { publicKey, connected, connecting } = useWallet();
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (connected && publicKey && onConnect) {
      onConnect(publicKey.toString());
    }
  }, [connected, publicKey, onConnect]);

  return (
    <div className={cn("relative", className)}>
      <WalletMultiButton
        className={cn(
          "!bg-transparent !border !border-primary !text-primary !font-mono !uppercase !tracking-wider",
          "!hover:bg-primary/10 !hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]",
          "!transition-all !duration-300 !rounded-none !px-6 !py-4 !h-auto",
          connecting && "!animate-pulse"
        )}
        style={{
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {!connected ? (
          <span className="flex items-center gap-2">
            <Binary className="h-5 w-5" />
            <span>CONNECT_WALLET</span>
            <span className={cn("text-primary/70", cursorVisible ? 'opacity-100' : 'opacity-0')}>_</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <span>{publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}</span>
          </span>
        )}
      </WalletMultiButton>
    </div>
  );
}

export function WalletConnectCard({ onConnect }: { onConnect?: (address: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative border border-primary/30 bg-black/95 p-8 max-w-md mx-auto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Scanline effect */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden pointer-events-none",
          hovered && "opacity-100"
        )}
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
      </div>

      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary blur-2xl opacity-20" />
          <Binary className="relative h-16 w-16 text-primary mx-auto" />
        </div>

        <div>
          <h2 className="text-2xl font-mono font-bold text-primary mb-2">
            MATRIX_TRADER_v2.0
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            AUTONOMOUS_SOLANA_TRADING_AGENT
          </p>
        </div>

        <div className="border border-primary/20 p-4 bg-primary/5">
          <p className="text-xs text-primary/70 font-mono leading-relaxed">
            Connect your Solana wallet to access the autonomous trading agent.
            You must accept the risk disclaimer before proceeding.
          </p>
        </div>

        <MatrixWalletButton onConnect={onConnect} />

        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-mono">
          <span>Supported:</span>
          <span className="text-primary/50">Phantom</span>
          <span>|</span>
          <span className="text-primary/50">Solflare</span>
          <span>|</span>
          <span className="text-primary/50">Backpack</span>
          <span>|</span>
          <span className="text-primary/50">Glow</span>
        </div>
      </div>
    </div>
  );
}
