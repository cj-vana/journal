import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, 'fixtures', '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.CHAOS_EMAIL || 'test-admin@chaos.local';
  const password = process.env.CHAOS_PASSWORD || 'testpass123';

  // Navigate to login page and wait for hydration
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Fill in credentials using fill() for reliability
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  // Listen specifically for the credentials callback response
  const callbackPromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/auth/callback/credentials'),
    { timeout: 15000 }
  ).catch(() => null);

  // Submit the form
  await page.locator('button[type="submit"]').click();

  // Wait for the auth callback
  const authResponse = await callbackPromise;
  if (authResponse) {
    console.log(`Auth callback: ${authResponse.status()} ${authResponse.url()}`);
  } else {
    console.log('No auth callback response captured');
  }

  // Wait for redirect to dashboard
  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Successfully redirected to dashboard');
    await page.context().storageState({ path: AUTH_FILE });
    return;
  } catch {
    // Check for error message
    const errorText = await page.locator('.bg-red-50').textContent().catch(() => null);
    if (errorText) {
      throw new Error(`Login failed with error: ${errorText}`);
    }

    // Take screenshot for debugging
    await page.screenshot({ path: path.join(__dirname, '..', 'test-results', 'login-failed.png') });
    console.log(`Current URL: ${page.url()}`);

    throw new Error(`Login did not redirect to dashboard. Current URL: ${page.url()}`);
  }
});
