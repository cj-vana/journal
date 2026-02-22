import { ChaosConfig } from './types';

export function loadConfig(): ChaosConfig {
  const debugKey = process.env.DEBUG_KEY;
  if (!debugKey) {
    throw new Error('DEBUG_KEY environment variable is required');
  }

  const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
  const intervalMs = parseInt(process.env.CHAOS_INTERVAL_MS || '30000', 10);
  const probability = parseFloat(process.env.CHAOS_PROBABILITY || '0.5');

  const enabledInjectors = process.env.ENABLED_INJECTORS
    ? process.env.ENABLED_INJECTORS.split(',').map((s) => s.trim())
    : [];

  return {
    targetUrl,
    debugKey,
    intervalMs,
    probability,
    enabledInjectors,
  };
}
