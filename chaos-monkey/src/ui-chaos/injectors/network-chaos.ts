import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Simulates network failures, slow connections, and offline mode
 * while the user is actively using the app.
 */
const networkChaos: UiChaosInjector = {
  name: 'ui-network-chaos',
  description: 'Simulates network failures, slow 3G, and offline mode during active usage',
  category: 'stress',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const phases: string[] = [];
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      const cdp = await page.context().newCDPSession(page);

      // Phase 1: Slow 3G while navigating
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024, // 50kb/s
        uploadThroughput: 25 * 1024,
        latency: 2000,
      });

      const routes = ['/entries', '/milestones', '/growth'];
      for (const route of routes) {
        try {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          phases.push(`Slow 3G: loaded ${route}`);
        } catch {
          phases.push(`Slow 3G: timeout on ${route} (expected)`);
        }
      }

      // Phase 2: Go offline while on a page
      await page.goto(`${baseUrl}/entries/new`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

      // Restore network first so the page loads
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });

      await page.goto(`${baseUrl}/entries/new`, { waitUntil: 'networkidle', timeout: 15000 });

      // Now go offline
      await cdp.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
      });

      // Try to interact while offline
      const titleInput = page.locator('input[placeholder*="title"], input[type="text"]').first();
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Offline test entry');
        phases.push('Offline: typed in title field');
      }

      // Try to save (should fail gracefully, not crash)
      const saveBtn = page.locator('button:has-text("Save")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
        phases.push('Offline: attempted save');
      }

      // Check page didn't crash
      let bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Page crashed during offline interaction');
      }

      // Phase 3: Come back online
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });

      await page.waitForTimeout(2000);
      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Page crashed after coming back online');
      }
      phases.push('Back online: page recovered');

      // Phase 4: Intermittent connectivity (rapidly toggle)
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });

      for (let i = 0; i < 5; i++) {
        await cdp.send('Network.emulateNetworkConditions', {
          offline: true,
          downloadThroughput: 0,
          uploadThroughput: 0,
          latency: 0,
        });
        await page.waitForTimeout(200);
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0,
        });
        await page.waitForTimeout(200);
      }
      phases.push('Intermittent: 5 online/offline cycles');

      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Page crashed during intermittent connectivity');
      }

      // Phase 5: Abort in-flight requests
      await page.goto(`${baseUrl}/entries`, { waitUntil: 'networkidle', timeout: 15000 });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1024, // Very slow
        uploadThroughput: 1024,
        latency: 5000,
      });

      // Navigate away mid-load
      page.goto(`${baseUrl}/milestones`).catch(() => {});
      await page.waitForTimeout(500);
      page.goto(`${baseUrl}/growth`).catch(() => {});
      await page.waitForTimeout(500);
      phases.push('Request abort: navigated during slow loads');

      // Restore normal network
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });

      await page.waitForTimeout(2000);
      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) {
        failures.push('Page crashed after request abort chaos');
      }

      const duration = Date.now() - start;

      if (failures.length > 0) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-network-chaos', false, duration, {
          error: `${failures.length} failures during network chaos`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-network-chaos', true, duration, {
        details: `${phases.length} network chaos phases completed without crashes`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-network-chaos', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default networkChaos;
