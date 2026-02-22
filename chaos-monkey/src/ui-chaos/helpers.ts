import { Page } from 'playwright';
import { UiChaosResult } from './types';

/** Login to the app and navigate to dashboard */
export async function login(page: Page, baseUrl: string, email: string, password: string): Promise<boolean> {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  return page.url().includes('/dashboard');
}

/** Capture console errors and unhandled exceptions */
export function setupErrorCapture(page: Page): { logs: string[]; errors: string[] } {
  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') {
      logs.push(`[console.error] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err: { message: string }) => {
    errors.push(`[uncaught] ${err.message}`);
  });

  return { logs, errors };
}

/** Take screenshot on failure */
export async function captureScreenshot(page: Page): Promise<string> {
  try {
    const buffer = await page.screenshot({ type: 'png', fullPage: true });
    return buffer.toString('base64');
  } catch {
    return '';
  }
}

/** Create a result helper */
export function makeResult(
  injector: string,
  passed: boolean,
  duration: number,
  opts: { error?: string; details?: string; screenshot?: string; consoleLogs?: string[]; uncaughtErrors?: string[] } = {}
): UiChaosResult {
  return {
    injector,
    timestamp: new Date(),
    passed,
    duration,
    ...opts,
  };
}

/** Click a random element from a set */
export async function clickRandom(page: Page, selector: string): Promise<{ clicked: boolean; text: string }> {
  const elements = await page.locator(selector).all();
  if (elements.length === 0) return { clicked: false, text: '' };
  const idx = Math.floor(Math.random() * elements.length);
  const text = await elements[idx].textContent() || '';
  await elements[idx].click({ timeout: 5000 }).catch(() => {});
  return { clicked: true, text: text.trim() };
}

/** Generate random string for fuzzing */
export function randomString(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** XSS payloads for testing */
export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  '"><script>alert(document.cookie)</script>',
  "javascript:alert('xss')",
  '<svg onload=alert(1)>',
  '<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:red;z-index:9999">HACKED</div>',
  '{{constructor.constructor("return this")().alert(1)}}',
  '<iframe src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '<input onfocus=alert(1) autofocus>',
];

/** SQL injection payloads */
export const SQLI_PAYLOADS = [
  "'; DROP TABLE entries; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "1; DELETE FROM entries WHERE 1=1",
  "admin'--",
];
