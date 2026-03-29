/**
 * Agent Scheduler - Initializes and manages the autonomous agent
 *
 * This module sets up background tasks for autonomous trading.
 * Call initialize() on app startup.
 */

import * as autonomous from './autonomous-service';

let initialized = false;
let scheduledTask: NodeJS.Timeout | null = null;

interface SchedulerConfig {
  enabled: boolean;
  scanIntervalMs: number;
  walletAddress?: string;
}

/**
 * Initialize the autonomous agent scheduler
 * Call this once on app startup
 */
export async function initialize(config?: SchedulerConfig) {
  if (initialized) {
    console.log('[AGENT_SCHEDULER] Already initialized');
    return;
  }

  const enabled = config?.enabled ?? process.env.AUTO_TRADING_ENABLED === 'true';
  const scanIntervalMs = config?.scanIntervalMs ?? parseInt(process.env.SCAN_INTERVAL_MS || '60000');
  const walletAddress = config?.walletAddress;

  console.log('[AGENT_SCHEDULER] Initializing...', { enabled, scanIntervalMs, walletAddress });

  if (!enabled) {
    console.log('[AGENT_SCHEDULER] Autonomous trading disabled. Set AUTO_TRADING_ENABLED=true to enable.');
    initialized = true;
    return;
  }

  if (!walletAddress) {
    console.warn('[AGENT_SCHEDULER] No wallet address provided. Agent will not start until wallet is connected.');
    initialized = true;
    return;
  }

  // Start the autonomous agent
  await autonomous.start(walletAddress);

  // Set up periodic status logging
  scheduledTask = setInterval(() => {
    const status = autonomous.getStatus();
    console.log('[AGENT_SCHEDULER] Status:', status);
  }, 300000); // Log status every 5 minutes

  initialized = true;
  console.log('[AGENT_SCHEDULER] Initialized successfully');
}

/**
 * Set the wallet address and start the agent
 * Call this when a user connects their wallet
 */
export async function setWalletAndStart(walletAddress: string) {
  console.log('[AGENT_SCHEDULER] Setting wallet and starting:', walletAddress);

  autonomous.setWalletAddress(walletAddress);

  const enabled = process.env.AUTO_TRADING_ENABLED === 'true';
  if (enabled && !autonomous.isEnabled()) {
    await autonomous.start(walletAddress);
  }

  return autonomous.getStatus();
}

/**
 * Stop the scheduler and autonomous agent
 */
export function shutdown() {
  console.log('[AGENT_SCHEDULER] Shutting down...');

  if (scheduledTask) {
    clearInterval(scheduledTask);
    scheduledTask = null;
  }

  autonomous.stop();
  initialized = false;

  console.log('[AGENT_SCHEDULER] Shutdown complete');
}

/**
 * Check if the scheduler is initialized
 */
export function isInitialized() {
  return initialized;
}

/**
 * Get the current status
 */
export function getStatus() {
  return {
    initialized,
    hasScheduledTask: scheduledTask !== null,
    ...autonomous.getStatus(),
  };
}
