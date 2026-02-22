import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Netflix-style: Rapidly navigate between all pages, hit back/forward,
 * interrupt page loads, and verify the app stays responsive.
 */
const rapidNavigation: UiChaosInjector = {
  name: 'ui-rapid-navigation',
  description: 'Rapidly navigates between pages, uses back/forward, interrupts loads to find race conditions',
  category: 'navigation',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const visited: string[] = [];
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      const routes = [
        '/dashboard',
        '/entries',
        '/entries/new',
        '/milestones',
        '/growth',
        '/settings',
        '/export',
      ];

      // Phase 1: Rapid sequential navigation (no wait for load)
      for (let i = 0; i < 20; i++) {
        const route = routes[Math.floor(Math.random() * routes.length)];
        try {
          // Don't wait for full load - interrupt it
          page.goto(`${baseUrl}${route}`, { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(100 + Math.random() * 400);
          visited.push(route);
        } catch {
          // Navigation interrupted - expected
        }
      }

      // Wait for whatever page we ended up on to settle
      await page.waitForTimeout(2000);
      await page.waitForLoadState('domcontentloaded').catch(() => {});

      // Check page is still alive
      let bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Page crashed after rapid navigation');
      }

      // Phase 2: Back/forward button spam
      for (let i = 0; i < 10; i++) {
        try {
          if (Math.random() > 0.5) {
            await page.goBack({ timeout: 3000 }).catch(() => {});
          } else {
            await page.goForward({ timeout: 3000 }).catch(() => {});
          }
          await page.waitForTimeout(100);
        } catch {
          // Expected - some history states may not exist
        }
      }

      await page.waitForTimeout(1000);
      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Page crashed after back/forward spam');
      }

      // Phase 3: Navigate to invalid routes
      const invalidRoutes = [
        '/nonexistent',
        '/entries/../../../etc/passwd',
        '/entries/%00%00',
        '/api/entries',
        '/entries/999999999',
        '/settings/../../admin',
      ];

      for (const route of invalidRoutes) {
        try {
          const res = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          const status = res?.status() || 0;
          visited.push(`${route} (${status})`);

          // Should get 404, redirect to login, or error page - NOT a 500
          if (status >= 500) {
            failures.push(`Server error ${status} on ${route}`);
          }

          bodyOk = await page.locator('body').count() > 0;
          if (!bodyOk) {
            failures.push(`Page crashed on invalid route: ${route}`);
          }
        } catch {
          // Timeout or navigation error - acceptable for invalid routes
        }
      }

      // Phase 4: Double-click navigation links rapidly
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
      const links = await page.locator('a[href^="/"]').all();
      for (let i = 0; i < Math.min(links.length, 5); i++) {
        try {
          const href = await links[i].getAttribute('href');
          if (href?.includes('delete') || href?.includes('logout')) continue;

          // Double-click to test race conditions
          await links[i].dblclick({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(200);
        } catch {
          // Element may be gone
        }
      }

      await page.waitForTimeout(1000);
      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Page crashed after double-click navigation');
      }

      const duration = Date.now() - start;
      const hasFatalErrors = errors.some(e =>
        !e.includes('hydration') &&
        !e.includes('Loading chunk') &&
        !e.includes('Abort') &&
        !e.includes('navigation')
      );

      if (failures.length > 0 || hasFatalErrors) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-rapid-navigation', false, duration, {
          error: `${failures.length} navigation failures, ${errors.length} uncaught errors`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-rapid-navigation', true, duration, {
        details: `Visited ${visited.length} routes (rapid + invalid + back/forward) without crashes`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-rapid-navigation', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default rapidNavigation;
