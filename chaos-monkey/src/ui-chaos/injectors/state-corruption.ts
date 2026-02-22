import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Attempts to corrupt client-side state by:
 * - Clearing localStorage/sessionStorage mid-session
 * - Modifying cookies
 * - Injecting invalid data into React state via DOM manipulation
 * - Opening multiple tabs (simulated via state manipulation)
 */
const stateCorruption: UiChaosInjector = {
  name: 'ui-state-corruption',
  description: 'Corrupts localStorage, sessionStorage, cookies, and DOM state during active usage',
  category: 'edge-cases',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const actions: string[] = [];
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      // Phase 1: Clear localStorage while on dashboard
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      actions.push('Cleared localStorage and sessionStorage');

      // Interact with the page
      await page.click('a[href="/entries"]').catch(() => {});
      await page.waitForTimeout(1000);

      let bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed after clearing storage');
      actions.push('Navigated after storage clear');

      // Phase 2: Inject garbage into localStorage
      await page.evaluate(() => {
        for (let i = 0; i < 100; i++) {
          localStorage.setItem(`chaos_${i}`, 'x'.repeat(10000));
        }
      });
      actions.push('Injected 1MB garbage into localStorage');

      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed after localStorage pollution');

      // Phase 3: Modify the DOM directly (simulate extension interference)
      await page.evaluate(() => {
        // Remove random elements
        const elements = document.querySelectorAll('div, section, main, aside');
        if (elements.length > 3) {
          const randomIdx = Math.floor(Math.random() * (elements.length - 1)) + 1;
          elements[randomIdx].remove();
        }
      });
      actions.push('Removed random DOM elements');

      // Try to interact with modified page
      const links = await page.locator('a[href^="/"]').all();
      if (links.length > 0) {
        const link = links[Math.floor(Math.random() * links.length)];
        const href = await link.getAttribute('href');
        if (href && !href.includes('delete')) {
          await link.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(1000);
          actions.push(`Clicked link after DOM mutation: ${href}`);
        }
      }

      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed after DOM mutation + navigation');

      // Phase 4: Delete all cookies mid-session
      await page.goto(`${baseUrl}/entries`, { waitUntil: 'networkidle', timeout: 15000 });
      const context = page.context();
      const cookies = await context.cookies();
      await context.clearCookies();
      actions.push(`Cleared ${cookies.length} cookies`);

      // Try to navigate (should redirect to login)
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
      const url = page.url();
      if (url.includes('/login') || url.includes('/register')) {
        actions.push('Correctly redirected to login after cookie clear');
      } else {
        // Could still be on dashboard if client-side session persists briefly
        actions.push(`After cookie clear, ended up on: ${url}`);
      }

      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed after cookie deletion');

      // Phase 5: Re-login and immediately manipulate session token
      await login(page, baseUrl, credentials.email, credentials.password);

      // Corrupt the session cookie
      const newCookies = await context.cookies();
      for (const cookie of newCookies) {
        if (cookie.name.includes('session') || cookie.name.includes('token') || cookie.name.includes('next-auth')) {
          await context.addCookies([{
            ...cookie,
            value: cookie.value.split('').reverse().join(''), // Corrupt the value
          }]);
          actions.push(`Corrupted cookie: ${cookie.name}`);
        }
      }

      // Navigate with corrupted session
      await page.goto(`${baseUrl}/entries`, { waitUntil: 'networkidle', timeout: 15000 });
      const afterCorruption = page.url();
      actions.push(`After session corruption, page: ${afterCorruption}`);

      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed after session corruption');

      // Phase 6: Fill localStorage with fake app state
      await page.evaluate(() => {
        localStorage.setItem('next-auth.session-token', 'fake-token-12345');
        localStorage.setItem('__NEXT_DATA__', JSON.stringify({ broken: true }));
      });
      actions.push('Injected fake session data into localStorage');

      await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed after fake state injection');

      // Cleanup
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      const duration = Date.now() - start;
      const hasFatalErrors = errors.some(e =>
        !e.includes('hydration') && !e.includes('Loading chunk') && !e.includes('Abort') && !e.includes('NEXT_NOT_FOUND')
      );

      if (failures.length > 0 || hasFatalErrors) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-state-corruption', false, duration, {
          error: `${failures.length} crashes, ${errors.length} uncaught errors`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-state-corruption', true, duration, {
        details: `${actions.length} state corruption actions without crashes`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-state-corruption', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default stateCorruption;
