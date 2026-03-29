'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Terminal, Shield, Flame, DollarSign, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const RISKS = [
  {
    icon: Flame,
    title: 'TOTAL LOSS RISK',
    description: 'Cryptocurrency trading involves substantial risk. You may lose ALL funds deployed by the autonomous agent. Past performance does not guarantee future results.',
  },
  {
    icon: Activity,
    title: 'AUTONOMOUS EXECUTION',
    description: 'When auto-trading is enabled, the agent will execute trades without your manual approval. Trades happen in real-time based on market conditions.',
  },
  {
    icon: DollarSign,
    title: 'NO FINANCIAL ADVICE',
    description: 'This platform does not provide financial advice. All trading decisions are made by an AI agent using algorithms and market data. You are solely responsible.',
  },
  {
    icon: Shield,
    title: 'SMART CONTRACT RISKS',
    description: 'Blockchain transactions are irreversible. Bugs, exploits, or market manipulation may result in loss of funds. The Solana network may experience downtime.',
  },
];

export function DisclaimerModal({ isOpen, onAccept, onReject }: DisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (isAtBottom) setScrolledToBottom(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95"
        >
          {/* Matrix Rain Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-[10px] text-primary/20 whitespace-nowrap font-mono"
                style={{ left: `${i * 5}%` }}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: '100vh', opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: 'linear',
                }}
              >
                {Array.from({ length: 10 }).map((_, j) => (
                  <div key={j} style={{ opacity: 1 - j * 0.1 }}>
                    {String.fromCharCode(0x30A0 + Math.random() * 96)}
                  </div>
                ))}
              </motion.div>
            ))}
          </div>

          <div className="relative w-full max-w-2xl border border-primary/50 bg-black/98 shadow-2xl shadow-primary/20"
          >
            {/* Header */}
            <div className="border-b border-primary/30 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-destructive blur-xl opacity-50" />
                  <AlertTriangle className="relative h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-mono font-bold text-primary flex items-center gap-2">
                    <span className="text-destructive">{'>'}</span>
                    RISK_WARNING
                    <span className={cn("text-primary", cursorVisible ? 'opacity-100' : 'opacity-0')}>_</span>
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    MANDATORY_DISCLAIMER_V1.0
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div
              className="max-h-[50vh] overflow-y-auto p-6 space-y-6"
              onScroll={handleScroll}
            >
              <div className="border border-primary/20 p-4 bg-primary/5">
                <p className="text-sm text-primary/80 font-mono leading-relaxed">
                  <span className="text-destructive font-bold">[CRITICAL]: </span>
                  Before accessing Matrix Trader, you must acknowledge the following risks.
                  This autonomous trading agent can execute real transactions on the Solana blockchain
                  using your wallet funds. Read carefully before proceeding.
                </p>
              </div>

              {RISKS.map((risk, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-primary/20 p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-primary blur-md opacity-20" />
                      <risk.icon className="relative h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-mono font-bold text-primary mb-1">
                        {index + 1}. {risk.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                        {risk.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="border border-destructive/30 p-4 bg-destructive/5">
                <p className="text-xs text-destructive/80 font-mono leading-relaxed">
                  <span className="text-destructive font-bold">[LEGAL_NOTICE]: </span>
                  By proceeding, you acknowledge that Matrix Trader and its creators are not
                  financial advisors. You are solely responsible for all trading decisions and
                  outcomes. The software is provided "as is" without warranties. Cryptocurrency
                  may be subject to regulatory oversight in your jurisdiction.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-primary/30 p-6 space-y-4"
            >
              {!scrolledToBottom && (
                <p className="text-xs text-amber-500 font-mono text-center animate-pulse">
                  {'>'} Scroll to bottom to acknowledge all risks {'<'}
                </p>
              )}

              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-risk"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked as boolean)}
                  disabled={!scrolledToBottom}
                  className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-black"
                />
                <label
                  htmlFor="accept-risk"
                  className="text-xs text-primary/80 font-mono cursor-pointer leading-relaxed"
                >
                  I have read, understood, and ACCEPT all risks. I acknowledge that I may lose
                  all funds and I am solely responsible for my trading decisions. I am of legal
                  age to trade cryptocurrencies in my jurisdiction.
                </label>
              </div>

              <div className="flex gap-4 pt-2">
                <Button
                  variant="outline"
                  onClick={onReject}
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive font-mono"
                >
                  [DECLINE]
                </Button>
                <Button
                  onClick={onAccept}
                  disabled={!accepted}
                  className={cn(
                    "flex-1 font-mono",
                    accepted
                      ? "bg-primary text-black hover:bg-primary/90"
                      : "bg-primary/20 text-primary/50 cursor-not-allowed"
                  )}
                >
                  [ACCEPT_RISKS]
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
