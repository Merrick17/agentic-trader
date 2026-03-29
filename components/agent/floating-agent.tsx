'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Binary,
  Cpu,
  Fish,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Search,
  Send, // Using Fish instead of Whale
  Sparkles,
  Terminal,
  TrendingUp,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Tool call card component
function ToolCallCard({ toolName }: { toolName: string }) {
  const toolIcons: Record<string, string> = {
    getTrendingTokens: '🔥',
    getTopBoostedTokens: '🚀',
    getNewListings: '🆕',
    searchToken: '🔍',
    getTokenOverview: '📊',
    getTokenSecurity: '🔒',
    getTokenPools: '💧',
    getOHLCV: '📈',
    getTokenPrices: '💵',
    getRecentTrades: '🔄',
    getTopTraders: '🏆',
    getWalletPnL: '💼',
    classifyTraderStrategy: '🎯',
    getJupiterQuote: '⚡',
    prepareSwap: '🔁',
  };

  const icon = toolIcons[toolName] ?? '🔧';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-[85%] border border-primary/20 bg-black/50 rounded-lg px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-mono text-primary/70">{toolName}</span>
        <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400 animate-pulse">
          running
        </Badge>
      </div>
    </motion.div>
  );
}

// Tool result card component
function ToolResultCard({ toolName, result }: { toolName: string; result: unknown }) {
  const toolIcons: Record<string, string> = {
    getTrendingTokens: '🔥',
    getTopBoostedTokens: '🚀',
    getNewListings: '🆕',
    searchToken: '🔍',
    getTokenOverview: '📊',
    getTokenSecurity: '🔒',
    getTokenPools: '💧',
    getOHLCV: '📈',
    getTokenPrices: '💵',
    getRecentTrades: '🔄',
    getTopTraders: '🏆',
    getWalletPnL: '💼',
    classifyTraderStrategy: '🎯',
    getJupiterQuote: '⚡',
    prepareSwap: '🔁',
  };

  const icon = toolIcons[toolName] ?? '🔧';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-[85%] border border-primary/20 bg-black/50 rounded-lg px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-mono text-primary/70">{toolName}</span>
        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
          done
        </Badge>
      </div>
      {result !== undefined && result !== null && (
        <p className="mt-1 text-[10px] text-primary/50 font-mono truncate">
          {typeof result === 'object'
            ? JSON.stringify(result as Record<string, unknown>).slice(0, 120) + '...'
            : String(result).slice(0, 120)}
        </p>
      )}
    </motion.div>
  );
}

export function FloatingAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [isLoadingAutonomous, setIsLoadingAutonomous] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { publicKey } = useWallet();
  
  const [input, setInput] = useState('');
  
  // Note: the newer @ai-sdk/react useChat does not expose input or isLoading
  const { messages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/agent',
    }),
  });
  
  const isLoading = status === 'submitted' || status === 'streaming';

  // Fetch autonomous status on mount
  useEffect(() => {
    fetch('/api/autonomous')
      .then((res) => res.json())
      .then((data) => {
        if (data.status?.isRunning) {
          setIsAutonomous(true);
        }
      })
      .catch(() => {});
  }, []);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const messageText = input;
    setInput('');
    sendMessage({ text: messageText });
  };

  // Quick-fire prompt buttons
  const quickPrompts = [
    { label: 'Scan Market', icon: TrendingUp, prompt: 'Scan the Solana market for top volume surges and trending tokens right now. Give me a ranked list with signals.' },
    { label: 'Find Whales', icon: Fish, prompt: 'Find the top performing traders on the highest volume Solana token right now. Classify their strategies.' },
    { label: 'New Listings', icon: Sparkles, prompt: 'Show me the newest token listings on Solana. Filter for any that look promising and flag the risky ones.' },
    { label: 'Deep Dive', icon: Search, prompt: 'Pick the #1 trending token and give me a full analysis: price, liquidity, security, top traders, and a trading signal.' },
  ];

  const handleQuickPrompt = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  // Toggle autonomous trading
  const toggleAutonomous = async () => {
    setIsLoadingAutonomous(true);
    try {
      if (isAutonomous) {
        // Stop autonomous trading
        const res = await fetch('/api/autonomous', { method: 'DELETE' });
        if (res.ok) {
          setIsAutonomous(false);
        }
      } else {
        // Start autonomous trading
        const res = await fetch('/api/autonomous', { method: 'POST' });
        if (res.ok) {
          setIsAutonomous(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle autonomous mode:', error);
    } finally {
      setIsLoadingAutonomous(false);
    }
  };


  return (
    <>
      {/* Floating Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="relative h-14 w-14 rounded bg-black border border-primary hover:bg-primary/10 shadow-lg shadow-primary/20"
            >
              <div className="absolute inset-0 bg-primary blur-xl opacity-20 animate-pulse" />
              <Binary className="relative h-6 w-6 text-primary" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-50 font-mono',
              isMinimized
                ? 'bottom-6 right-6 w-80'
                : 'bottom-6 right-6 w-96 md:w-[32rem]'
            )}
          >
            <Card className="border-primary/30 bg-black/95 backdrop-blur-xl shadow-2xl shadow-primary/10">
              {/* Header */}
              <CardHeader className="p-4 border-b border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary blur-lg opacity-30 animate-pulse" />
                      <div className="relative h-10 w-10 rounded bg-black border border-primary/50 flex items-center justify-center">
                        <Cpu className="h-5 w-5 text-primary" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-black shadow-[0_0_8px_rgba(0,255,65,0.8)]" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary font-mono">AGENT.EXE</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary bg-primary/10"
                        >
                          llama-3.3-70b
                        </Badge>
                      </div>
                      <span className="text-[10px] text-primary/70 font-mono">
                        {isLoading ? 'PROCESSING...' : 'READY_'}
                        <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>_</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8 text-muted-foreground hover:text-primary',
                        isAutonomous && 'text-primary'
                      )}
                      onClick={toggleAutonomous}
                      disabled={isLoadingAutonomous}
                      title={isAutonomous ? 'Stop autonomous' : 'Start autonomous'}
                    >
                      {isLoadingAutonomous ? (
                        <Activity className="h-4 w-4 animate-spin" />
                      ) : isAutonomous ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? (
                        <Maximize2 className="h-4 w-4" />
                      ) : (
                        <Minimize2 className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center gap-3 mt-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-2 py-0 h-5 font-mono',
                      isAutonomous
                        ? 'border-primary/50 text-primary bg-primary/10'
                        : 'border-primary/30 text-primary/70'
                    )}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {isAutonomous ? 'AUTONOMOUS' : 'MANUAL'}
                  </Badge>

                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0 h-5 font-mono border-primary/30 text-primary/70"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    LIVE
                  </Badge>

                  {publicKey && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0 h-5 font-mono border-emerald-500/30 text-emerald-400"
                    >
                      {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {/* Content */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="p-0">
                      {/* Messages */}
                      <ScrollArea
                        ref={scrollRef}
                        className="h-80 px-4 py-4"
                      >
                        {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-primary blur-xl opacity-20" />
                              <div className="relative h-16 w-16 rounded bg-black border border-primary/30 flex items-center justify-center">
                                <Cpu className="h-8 w-8 text-primary" />
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-primary font-mono">AGENT_ONLINE</p>
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                Ask me to scan markets, analyze tokens, find whales, or execute swaps
                              </p>
                            </div>

                            {/* Quick Prompt Buttons */}
                            <div className="grid grid-cols-2 gap-2 w-full">
                              {quickPrompts.map(({ label, icon: Icon, prompt }) => (
                                <Button
                                  key={label}
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-auto py-2 border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:border-emerald-400 hover:bg-emerald-950/30 font-mono flex items-center gap-2"
                                  onClick={() => handleQuickPrompt(prompt)}
                                >
                                  <Icon className="h-3 w-3" />
                                  {label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {messages.map((msg: UIMessage, i: number) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  'flex flex-col gap-2',
                                  msg.role === 'user' ? 'items-end' : 'items-start'
                                )}
                              >
                                {/* User message */}
                                {msg.role === 'user' && (
                                  <div className="max-w-[80%] rounded-lg bg-primary/20 border border-primary/30 px-4 py-2 text-sm text-primary font-mono">
                                    {msg.parts?.map((part: any, idx: number) => 
                                      part.type === 'text' ? <span key={idx}>{part.text}</span> : null
                                    )}
                                  </div>
                                )}

                                {/* Assistant text response */}
                                {msg.role === 'assistant' && (
                                  <div className="max-w-[90%] rounded-lg border border-primary/20 bg-black/50 p-3 flex flex-col gap-2">
                                    {msg.parts?.filter((p: any) => p.type === 'text').length > 0 && (
                                      <p className="text-sm text-primary/80 whitespace-pre-wrap leading-relaxed font-mono">
                                        {msg.parts?.map((part: any, idx: number) => 
                                          part.type === 'text' ? <span key={idx}>{part.text}</span> : null
                                        )}
                                      </p>
                                    )}
                                    
                                    {/* Tool invocations */}
                                    {msg.parts?.filter((p: any) => p.type.startsWith('tool-') || p.type === 'dynamic-tool').map((part: any, idx: number) => {
                                      const toolName = part.toolName || part.type.split('-').slice(1).join('-');
                                      return (
                                        <div key={part.toolCallId || idx} className="flex flex-col gap-2">
                                          {(part.state === 'input-streaming' || part.state === 'input-available') && (
                                            <ToolCallCard toolName={toolName} />
                                          )}
                                          {part.state === 'output-available' && (
                                            <ToolResultCard 
                                              toolName={toolName} 
                                              result={part.output} 
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                              </motion.div>
                            ))}
                            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                              <div className="flex items-center gap-2 text-xs text-primary/50">
                                <span className="animate-pulse">●</span>
                                <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                                <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                                <span className="ml-1">Agent thinking...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </ScrollArea>

                      {/* Input */}
                      <form onSubmit={onSubmit} className="p-4 border-t border-primary/20">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                            <Input
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Ask the agent anything..."
                              disabled={status !== 'ready' && !isLoading}
                              className="pl-10 bg-black/50 border-primary/30 text-primary placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 font-mono"
                            />
                          </div>
                          <Button
                            type="submit"
                            size="icon"
                            disabled={status !== 'ready' && !isLoading}
                            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
