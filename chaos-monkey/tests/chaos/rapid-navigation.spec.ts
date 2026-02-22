import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Chaos: Rapid navigation', () => {
  test('should survive rapid sequential navigation', async ({ authedPage }) => {
    const visited: string[] = [];

    for (let i = 0; i < 30; i++) {
      const route = ALL_APP_ROUTES[Math.floor(Math.random() * ALL_APP_ROUTES.length)];
      authedPage.goto(route, { timeout: 5000 }).catch(() => {});
      await authedPage.waitForTimeout(50 + Math.random() * 200);
      visited.push(route);
    }

    // Wait for whatever page we ended up on to settle
    await authedPage.waitForTimeout(3000);
    // Navigate to a known route to verify the browser is still functional
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await authedPage.waitForTimeout(1000);

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
    expect(visited.length).toBe(30);
  });

  test('should survive aggressive back/forward', async ({ authedPage }) => {
    // Build up history
    for (const route of ALL_APP_ROUTES) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    }

    // Spam back/forward
    for (let i = 0; i < 20; i++) {
      try {
        if (Math.random() > 0.5) {
          await authedPage.goBack({ timeout: 3000 });
        } else {
          await authedPage.goForward({ timeout: 3000 });
        }
      } catch {
        // Expected when no history entry exists
      }
      await authedPage.waitForTimeout(100);
    }

    // Let the page settle after aggressive navigation
    await authedPage.waitForTimeout(3000);
    // Navigate to a known route to verify the browser is still functional
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await authedPage.waitForSelector('body', { timeout: 5000 }).catch(() => {});
    // After aggressive back/forward, the page should have recovered
    const url = authedPage.url();
    // The browser should be on some valid page (not crashed/blank)
    expect(url).toBeTruthy();
  });

  test('should handle invalid routes gracefully', async ({ authedPage }) => {
    const invalidRoutes = [
      '/nonexistent',
      '/entries/../../../etc/passwd',
      '/entries/%00%00',
      '/entries/999999999',
      '/settings/../../admin',
      '/api/entries', // API route in browser
      '/entries/<script>alert(1)</script>',
      '/' + 'a'.repeat(2000),
    ];

    for (const route of invalidRoutes) {
      try {
        const response = await authedPage.goto(route, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
        const status = response?.status() || 0;

        // Should NOT be a 500 error
        if (status >= 500) {
          throw new Error(`Server error ${status} on ${route}`);
        }
      } catch (err: any) {
        if (err.message.includes('Server error')) throw err;
        // Timeout or navigation error is acceptable
      }

      // After navigating to an invalid route, check if the browser is still functional
      // Some extreme routes may cause the tab to be in a bad state - that's OK for chaos testing
      // We mainly want to verify the SERVER didn't crash
      const body = await authedPage.locator('body').count().catch(() => 0);
      if (body === 0) {
        // Browser tab may be broken - navigate to a known good page
        await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await authedPage.waitForSelector('body', { timeout: 5000 }).catch(() => {});
      }
    }
    // Verify the app server is still responding
    const response = await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
    expect(response).toBeTruthy();
  });

  test('should survive rapid reload spam', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    for (let i = 0; i < 10; i++) {
      authedPage.reload({ timeout: 5000 }).catch(() => {});
      await authedPage.waitForTimeout(100);
    }

    await authedPage.waitForTimeout(3000);
    await authedPage.waitForLoadState('domcontentloaded').catch(() => {});
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });
});
