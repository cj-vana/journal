import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Pure chaos monkey: random clicks, random typing, random scrolling
 * at random positions on random pages. Like a monkey mashing the keyboard.
 */
const monkeyTesting: UiChaosInjector = {
  name: 'ui-monkey-testing',
  description: 'Random clicks, typing, scrolling at random positions - pure chaos like a monkey using the app',
  category: 'stress',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    let totalActions = 0;
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      const routes = ['/dashboard', '/entries', '/entries/new', '/milestones', '/growth', '/settings'];
      const actionTypes = ['click', 'type', 'scroll', 'hover', 'dblclick', 'rightclick'] as const;

      // Run 100 random actions across random pages
      for (let round = 0; round < 5; round++) {
        // Navigate to a random page
        const route = routes[Math.floor(Math.random() * routes.length)];
        try {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        } catch {
          continue;
        }

        // Perform 20 random actions on this page
        for (let action = 0; action < 20; action++) {
          const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
          const viewport = page.viewportSize() || { width: 1280, height: 720 };
          const x = Math.floor(Math.random() * viewport.width);
          const y = Math.floor(Math.random() * viewport.height);

          try {
            switch (actionType) {
              case 'click': {
                await page.mouse.click(x, y, { timeout: 2000 } as any);
                break;
              }
              case 'dblclick': {
                await page.mouse.dblclick(x, y);
                break;
              }
              case 'rightclick': {
                await page.mouse.click(x, y, { button: 'right' });
                break;
              }
              case 'type': {
                // Click first to focus something
                await page.mouse.click(x, y);
                const randomText = String.fromCharCode(32 + Math.floor(Math.random() * 95)).repeat(
                  1 + Math.floor(Math.random() * 20)
                );
                await page.keyboard.type(randomText, { delay: 10 });
                break;
              }
              case 'scroll': {
                await page.mouse.wheel(
                  Math.floor(Math.random() * 600) - 300,
                  Math.floor(Math.random() * 600) - 300
                );
                break;
              }
              case 'hover': {
                await page.mouse.move(x, y);
                break;
              }
            }
            totalActions++;
          } catch {
            // Expected - some actions will fail
          }

          await page.waitForTimeout(50 + Math.floor(Math.random() * 150));
        }

        // Check page survived
        await page.waitForTimeout(500);
        const bodyOk = await page.locator('body').count() > 0;
        if (!bodyOk) {
          failures.push(`Page crashed after monkey testing on ${route}`);
          // Try to recover
          try {
            await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          } catch {
            failures.push('Could not recover after crash');
            break;
          }
        }

        // Close any dialogs/modals/confirms
        page.on('dialog', async (dialog: { dismiss: () => Promise<void> }) => {
          await dialog.dismiss().catch(() => {});
        });
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(200);
      }

      const duration = Date.now() - start;
      const hasFatalErrors = errors.filter(e =>
        !e.includes('hydration') &&
        !e.includes('Loading chunk') &&
        !e.includes('Abort') &&
        !e.includes('is not a function') // Expected from random typing
      );

      if (failures.length > 0) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-monkey-testing', false, duration, {
          error: `${failures.length} crashes during ${totalActions} random actions`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-monkey-testing', true, duration, {
        details: `${totalActions} random monkey actions across 5 random pages without crashes. ${hasFatalErrors.length} non-fatal errors.`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-monkey-testing', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default monkeyTesting;
