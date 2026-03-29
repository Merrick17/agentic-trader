export interface SigninMessage {
  walletAddress: string;
  nonce: string;
  message: string;
  signature?: string;
}

export interface WalletConfig {
  autoApprove: boolean;
  maxTradeSize: number;
  maxDailyTrades: number;
  minConfidence: number;
  stopLossPct: number;
  takeProfitPct: number;
  emergencyStop: boolean;
}

export interface UserSettings {
  walletAddress: string;
  acceptedDisclaimer: boolean;
  acceptedAt?: string;
  config: WalletConfig;
}
