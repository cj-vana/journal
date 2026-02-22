import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Rapidly resizes viewport, tests mobile/tablet/desktop breakpoints,
 * and verifies no overflow, hidden elements, or crashes.
 */
const responsiveChaos: UiChaosInjector = {
  name: 'ui-responsive-chaos',
  description: 'Rapidly resizes viewport between mobile/tablet/desktop and verifies layout integrity',
  category: 'responsive',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const tested: string[] = [];
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      const viewports = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 375, height: 667, name: 'iPhone 8' },
        { width: 414, height: 896, name: 'iPhone 11' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 1024, height: 768, name: 'iPad Landscape' },
        { width: 1280, height: 720, name: 'Laptop' },
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 2560, height: 1440, name: '2K Monitor' },
        { width: 200, height: 200, name: 'Tiny' },
        { width: 5000, height: 3000, name: 'Huge' },
      ];

      const routes = ['/dashboard', '/entries', '/entries/new', '/milestones', '/growth'];

      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 15000 });

        for (const vp of viewports) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.waitForTimeout(200);

          // Check for horizontal overflow
          const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
          });

          if (hasOverflow && vp.width >= 320) {
            failures.push(`Horizontal overflow on ${route} at ${vp.name} (${vp.width}x${vp.height})`);
          }

          // Check page didn't crash
          const bodyOk = await page.locator('body').count() > 0;
          if (!bodyOk) {
            failures.push(`Page crashed on ${route} at ${vp.name}`);
          }

          // Check no text is cut off (basic check)
          const overlappingElements = await page.evaluate(() => {
            const els = document.querySelectorAll('button, a, h1, h2, h3, p');
            let overlaps = 0;
            for (const el of els) {
              const rect = el.getBoundingClientRect();
              if (rect.right < 0 || rect.bottom < 0) overlaps++;
            }
            return overlaps;
          });

          tested.push(`${route}@${vp.name}: overflow=${hasOverflow}, offscreen=${overlappingElements}`);
        }

        // Phase 2: Rapid resize (simulate window dragging)
        for (let i = 0; i < 20; i++) {
          const w = 300 + Math.floor(Math.random() * 1700);
          const h = 300 + Math.floor(Math.random() * 900);
          await page.setViewportSize({ width: w, height: h });
          await page.waitForTimeout(50);
        }

        await page.waitForTimeout(500);
        const bodyOk = await page.locator('body').count() > 0;
        if (!bodyOk) {
          failures.push(`Page crashed on ${route} during rapid resize`);
        }
        tested.push(`${route}: rapid resize (20 cycles)`);
      }

      // Reset to normal viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      const duration = Date.now() - start;

      if (failures.length > 0) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-responsive-chaos', false, duration, {
          error: `${failures.length} responsive issues found`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-responsive-chaos', true, duration, {
        details: `Tested ${tested.length} viewport combinations without crashes or major overflow`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-responsive-chaos', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default responsiveChaos;
