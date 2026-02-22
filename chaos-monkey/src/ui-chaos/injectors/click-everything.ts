import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Netflix-style: Click every clickable element on every page.
 * Verifies no crashes, no uncaught errors, and page stays responsive.
 */
const clickEverything: UiChaosInjector = {
  name: 'ui-click-everything',
  description: 'Navigates to every page and clicks every interactive element - buttons, links, inputs',
  category: 'interaction',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const clickedElements: string[] = [];
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      const routes = ['/dashboard', '/entries', '/milestones', '/growth', '/settings'];

      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 15000 });

        // Find all interactive elements
        const interactiveSelectors = [
          'button:not([disabled])',
          'a[href]:not([href^="http"]):not([href^="mailto"])',
          '[role="button"]',
          '[tabindex="0"]',
        ];

        for (const selector of interactiveSelectors) {
          const elements = await page.locator(selector).all();

          for (let i = 0; i < Math.min(elements.length, 10); i++) {
            try {
              const el = elements[i];
              const tag = await el.evaluate((e: Element) => e.tagName);
              const text = (await el.textContent() || '').trim().slice(0, 30);
              const isVisible = await el.isVisible().catch(() => false);

              if (!isVisible) continue;

              // Don't click destructive actions (delete, logout) or external links
              const fullText = text.toLowerCase();
              if (fullText.includes('delete') || fullText.includes('logout') || fullText.includes('sign out') || fullText.includes('remove')) {
                continue;
              }

              await el.click({ timeout: 3000, force: true }).catch(() => {});
              clickedElements.push(`${route}: ${tag}[${text}]`);

              // Wait a beat for any modals/transitions
              await page.waitForTimeout(300);

              // Check page didn't crash
              const bodyExists = await page.locator('body').count();
              if (bodyExists === 0) {
                failures.push(`Page crashed after clicking ${tag}[${text}] on ${route}`);
              }

              // Close any open modals
              const escapeKey = page.keyboard.press('Escape');
              await escapeKey.catch(() => {});
              await page.waitForTimeout(200);

            } catch (err: any) {
              // Element may have been removed from DOM - that's ok
              if (!err.message.includes('detached') && !err.message.includes('Target closed')) {
                failures.push(`Click error on ${route}: ${err.message.slice(0, 100)}`);
              }
            }
          }
        }

        // Navigate back to route if we got redirected
        if (!page.url().includes(route)) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
        }
      }

      const duration = Date.now() - start;
      const hasFatalErrors = errors.some(e =>
        !e.includes('hydration') && !e.includes('Loading chunk')
      );

      if (failures.length > 0 || hasFatalErrors) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-click-everything', false, duration, {
          error: `${failures.length} click failures, ${errors.length} uncaught errors`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-click-everything', true, duration, {
        details: `Clicked ${clickedElements.length} elements across ${routes.length} pages without crashes`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-click-everything', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default clickEverything;
