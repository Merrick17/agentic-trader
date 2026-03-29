'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { DisclaimerModal } from '@/components/auth/disclaimer-modal';
import { WalletConnectCard } from '@/components/auth/wallet-button';
import { Binary, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SignInPage() {
  const { publicKey, connected, signMessage } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [bootSequence, setBootSequence] = useState(true);

  const redirect = searchParams.get('redirect') || '/dashboard';
  const requiresDisclaimer = searchParams.get('requiresDisclaimer') === 'true';

  // Boot sequence effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setBootSequence(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Cursor blink effect
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Show disclaimer when wallet connects
  useEffect(() => {
    if (connected && publicKey && !isAuthenticating) {
      // Check if user has already accepted disclaimer
      checkDisclaimerStatus(publicKey.toString());
    }
  }, [connected, publicKey]);

  const checkDisclaimerStatus = async (walletAddress: string) => {
    try {
      const response = await fetch(`/api/user/status?wallet=${walletAddress}`);
      const data = await response.json();

      if (data.acceptedDisclaimer && !requiresDisclaimer) {
        // Already accepted, authenticate
        authenticate(walletAddress);
      } else {
        // Show disclaimer
        setShowDisclaimer(true);
      }
    } catch (error) {
      // User not found or error, show disclaimer
      setShowDisclaimer(true);
    }
  };

  const authenticate = async (walletAddress: string) => {
    setIsAuthenticating(true);
    try {
      // Get sign message from server
      const initResponse = await fetch('/api/auth/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      const { message, nonce } = await initResponse.json();

      // Sign message with wallet
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage?.(messageBytes);

      if (!signature) {
        throw new Error('Failed to sign message');
      }

      // Convert signature to base58 string
      const signatureBase58 = Buffer.from(signature).toString('base64');

      // Verify and create session
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          message,
          signature: signatureBase58,
          acceptedDisclaimer: true,
        }),
      });

      if (verifyResponse.ok) {
        router.push(redirect);
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticating(false);
    }
  };

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    if (publicKey) {
      authenticate(publicKey.toString());
    }
  };

  const handleDisclaimerReject = () => {
    setShowDisclaimer(false);
    // Disconnect wallet or redirect
    window.location.href = '/';
  };

  if (bootSequence) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 font-mono text-xs text-primary"
          >
            <div className="flex items-center gap-2 mb-8">
              <Binary className="h-8 w-8 text-primary" />
              <span className="text-lg font-bold">MATRIX_TRADER</span>
            </div>

            {[
              'Initializing terminal...',
              'Loading neural network modules...',
              'Connecting to Solana RPC...',
              'Establishing secure connection...',
            ].map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.4 }}
                className="flex items-center gap-2"
              >
                <span className="text-primary/50">{'>'}</span>
                <span>{line}</span>
                {i === 3 && (
                  <span className={cn("text-primary/70", cursorVisible ? 'opacity-100' : 'opacity-0')}>_</span>
                )}
              </motion.div>
            ))}

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 1.6, duration: 0.3 }}
              className="h-[2px] bg-primary/30 mt-4"
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Matrix Rain Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[10px] text-primary/20 whitespace-nowrap font-mono"
            style={{ left: `${i * 3.5}%` }}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: '100vh', opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear',
            }}
          >
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} style={{ opacity: 1 - j * 0.1 }}>
                {String.fromCharCode(0x30A0 + Math.random() * 96)}
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <WalletConnectCard />

        <div className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground font-mono">
            BY CONNECTING, YOU AGREE TO THE
          </p>
          <p className="text-[10px] text-primary/50 font-mono mt-1">
            TERMS_OF_SERVICE AND PRIVACY_POLICY
          </p>
        </div>

        {isAuthenticating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-primary font-mono animate-pulse">
              AUTHENTICATING...
            </p>
          </motion.div>
        )}
      </div>

      <DisclaimerModal
        isOpen={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onReject={handleDisclaimerReject}
      />
    </div>
  );
}
