import { Page, BrowserContext } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Opens multiple browser tabs/pages and performs concurrent operations
 * to test race conditions, session conflicts, and data consistency.
 */
const concurrentTabs: UiChaosInjector = {
  name: 'ui-concurrent-tabs',
  description: 'Opens multiple tabs performing concurrent operations to test race conditions',
  category: 'stress',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const actions: string[] = [];
    const failures: string[] = [];
    const context = page.context();

    try {
      // Login on first tab
      await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.fill('input[type="email"], input[name="email"]', credentials.email);
      await page.fill('input[type="password"], input[name="password"]', credentials.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Open 3 more tabs
      const tabs: Page[] = [page];
      for (let i = 0; i < 3; i++) {
        const tab = await context.newPage();
        tabs.push(tab);
      }
      actions.push(`Opened ${tabs.length} tabs`);

      // Navigate each tab to a different page
      const routes = ['/dashboard', '/entries', '/milestones', '/growth'];
      await Promise.all(
        tabs.map((tab, i) =>
          tab.goto(`${baseUrl}${routes[i % routes.length]}`, {
            waitUntil: 'networkidle',
            timeout: 15000,
          }).catch(() => {})
        )
      );
      actions.push('All tabs navigated simultaneously');

      // Concurrent navigation to same page
      await Promise.all(
        tabs.map((tab) =>
          tab.goto(`${baseUrl}/entries`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
        )
      );
      actions.push('All tabs loaded /entries simultaneously');

      // Check all tabs survived
      for (let i = 0; i < tabs.length; i++) {
        const bodyOk = await tabs[i].locator('body').count().catch(() => 0) > 0;
        if (!bodyOk) {
          failures.push(`Tab ${i} crashed during concurrent navigation`);
        }
      }

      // Concurrent form interactions
      // Tab 1: Navigate to new entry
      // Tab 2: Navigate to milestones
      // Tab 3: Navigate to growth
      // Tab 4: Navigate to settings
      const formRoutes = ['/entries/new', '/milestones', '/growth', '/settings'];
      await Promise.all(
        tabs.map((tab, i) =>
          tab.goto(`${baseUrl}${formRoutes[i % formRoutes.length]}`, {
            waitUntil: 'networkidle',
            timeout: 15000,
          }).catch(() => {})
        )
      );

      // Simultaneously interact with forms
      const interactions = tabs.map(async (tab, i) => {
        try {
          const inputs = await tab.locator('input[type="text"], input:not([type])').all();
          for (const input of inputs.slice(0, 2)) {
            if (await input.isVisible().catch(() => false)) {
              await input.fill(`Tab ${i} concurrent write`).catch(() => {});
            }
          }
          actions.push(`Tab ${i}: filled inputs on ${formRoutes[i % formRoutes.length]}`);
        } catch {
          // Tab may have navigated away
        }
      });
      await Promise.all(interactions);

      // Check all tabs survived form interaction
      for (let i = 0; i < tabs.length; i++) {
        const bodyOk = await tabs[i].locator('body').count().catch(() => 0) > 0;
        if (!bodyOk) {
          failures.push(`Tab ${i} crashed during concurrent form interaction`);
        }
      }

      // Rapid tab switching (simulate user clicking between tabs)
      for (let i = 0; i < 10; i++) {
        const tab = tabs[Math.floor(Math.random() * tabs.length)];
        await tab.bringToFront();
        await tab.waitForTimeout(100);
      }
      actions.push('Rapid tab switching (10 switches)');

      // Close extra tabs
      for (let i = 1; i < tabs.length; i++) {
        await tabs[i].close().catch(() => {});
      }
      actions.push('Closed extra tabs');

      // Verify original tab still works
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
      const bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Original tab crashed after closing other tabs');
      }

      const duration = Date.now() - start;

      if (failures.length > 0) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-concurrent-tabs', false, duration, {
          error: `${failures.length} tab failures`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-concurrent-tabs', true, duration, {
        details: `${actions.length} concurrent tab operations completed without crashes`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-concurrent-tabs', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default concurrentTabs;
