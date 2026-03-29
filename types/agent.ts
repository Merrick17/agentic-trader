export interface AgentState {
  status: 'idle' | 'analyzing' | 'trading' | 'paused' | 'error';
  lastRunAt?: Date;
  currentTask?: string;
  errorMessage?: string;
}

export interface AgentMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: Record<string, unknown>;
    reasoning?: string;
  };
}

export interface AgentConfig {
  autoTradingEnabled: boolean;
  maxTradeAmount: number;
  minConfidence: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  whitelistedTokens: string[];
  blacklistedTokens: string[];
  slippageTolerance: number;
}

export interface AgentReasoningStep {
  step: number;
  action: string;
  thought: string;
  observation?: string;
  timestamp: Date;
}

export interface AgentToolCall {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  timestamp: Date;
  duration: number;
}
