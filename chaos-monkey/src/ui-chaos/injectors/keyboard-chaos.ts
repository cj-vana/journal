import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult } from '../helpers';

/**
 * Tests keyboard navigation, shortcuts, tab order, and keyboard-only interaction.
 * Simulates a user who only uses keyboard (accessibility + chaos).
 */
const keyboardChaos: UiChaosInjector = {
  name: 'ui-keyboard-chaos',
  description: 'Tests keyboard navigation, tab order, escape handling, and shortcut keys on all pages',
  category: 'interaction',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const actions: string[] = [];
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      const routes = ['/dashboard', '/entries', '/entries/new', '/milestones', '/growth', '/settings'];

      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 15000 });

        // Tab through all focusable elements
        let tabCount = 0;
        const maxTabs = 50;
        const focusedElements: string[] = [];

        for (let i = 0; i < maxTabs; i++) {
          await page.keyboard.press('Tab');
          tabCount++;

          try {
            const focused = await page.evaluate(() => {
              const el = document.activeElement;
              if (!el || el === document.body) return null;
              return {
                tag: el.tagName,
                type: (el as HTMLInputElement).type || '',
                text: el.textContent?.trim().slice(0, 30) || '',
                role: el.getAttribute('role') || '',
                ariaLabel: el.getAttribute('aria-label') || '',
              };
            });

            if (focused) {
              focusedElements.push(`${focused.tag}${focused.type ? `[${focused.type}]` : ''}(${focused.text || focused.ariaLabel})`);
            }

            // If we tabbed back to body, we've gone through all elements
            if (!focused) break;
          } catch {
            break;
          }
        }

        actions.push(`${route}: tabbed through ${focusedElements.length} elements`);

        // Test Escape key on modals/dropdowns
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // Test Enter on focused elements (but not delete buttons)
        await page.keyboard.press('Tab');
        const activeText = await page.evaluate(() => document.activeElement?.textContent?.toLowerCase() || '');
        if (!activeText.includes('delete') && !activeText.includes('remove')) {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
          actions.push(`${route}: pressed Enter on focused element`);
        }

        // Spam keyboard shortcuts
        const shortcuts = [
          { key: 'a', modifiers: ['Control'] },
          { key: 'z', modifiers: ['Control'] },
          { key: 'y', modifiers: ['Control'] },
          { key: 's', modifiers: ['Control'] },
          { key: 'b', modifiers: ['Control'] },
          { key: 'i', modifiers: ['Control'] },
          { key: 'u', modifiers: ['Control'] },
        ];

        for (const shortcut of shortcuts) {
          try {
            const mod = shortcut.modifiers[0];
            await page.keyboard.down(mod);
            await page.keyboard.press(shortcut.key);
            await page.keyboard.up(mod);
            await page.waitForTimeout(50);
          } catch {
            // Some shortcuts may not be supported
          }
        }
        actions.push(`${route}: tested ${shortcuts.length} keyboard shortcuts`);

        // Check page didn't crash
        const bodyOk = await page.locator('body').count() > 0;
        if (!bodyOk) {
          failures.push(`Page crashed on ${route} during keyboard chaos`);
        }

        // Arrow key spam (for dropdowns, lists)
        for (let i = 0; i < 10; i++) {
          const key = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'][Math.floor(Math.random() * 4)];
          await page.keyboard.press(key);
          await page.waitForTimeout(50);
        }
        actions.push(`${route}: arrow key spam`);

        // Space bar (toggles, buttons)
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
      }

      const duration = Date.now() - start;
      const hasFatalErrors = errors.some(e =>
        !e.includes('hydration') && !e.includes('Loading chunk') && !e.includes('Abort')
      );

      if (failures.length > 0 || hasFatalErrors) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-keyboard-chaos', false, duration, {
          error: `${failures.length} crashes, ${errors.length} uncaught errors`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-keyboard-chaos', true, duration, {
        details: `${actions.length} keyboard actions across ${routes.length} pages without crashes`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-keyboard-chaos', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default keyboardChaos;
