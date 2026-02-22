import { Page } from 'playwright';

export interface UiChaosResult {
  injector: string;
  timestamp: Date;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
  screenshot?: string; // base64 screenshot on failure
  consoleLogs?: string[];
  uncaughtErrors?: string[];
}

export interface UiChaosInjector {
  name: string;
  description: string;
  category: 'navigation' | 'interaction' | 'forms' | 'stress' | 'edge-cases' | 'responsive';
  run: (page: Page, baseUrl: string, credentials: { email: string; password: string }) => Promise<UiChaosResult>;
}
