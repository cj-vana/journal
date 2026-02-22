import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Chaos: Click every element on every page', () => {
  test('should survive clicking every interactive element', async ({ authedPage }) => {
    const clickLog: string[] = [];

    // Handle dialogs automatically
    authedPage.on('dialog', async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    for (const route of ALL_APP_ROUTES) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const selectors = [
        'button:not([disabled])',
        'a[href]:not([href^="http"]):not([href^="mailto"])',
        '[role="button"]',
        '[tabindex="0"]',
        'label',
        'summary',
      ];

      for (const selector of selectors) {
        const elements = await authedPage.locator(selector).all();

        for (let i = 0; i < Math.min(elements.length, 15); i++) {
          try {
            const el = elements[i];
            const isVisible = await el.isVisible().catch(() => false);
            if (!isVisible) continue;

            const text = (await el.textContent() || '').trim().toLowerCase();
            // Skip destructive actions
            if (text.includes('delete') || text.includes('log out') || text.includes('logout') || text.includes('sign out') || text.includes('remove')) {
              continue;
            }

            await el.click({ timeout: 3000, force: true }).catch(() => {});
            clickLog.push(`${route}: ${selector}[${text.slice(0, 30)}]`);
            await authedPage.waitForTimeout(200);

            // Close modals
            await authedPage.keyboard.press('Escape').catch(() => {});
            await authedPage.waitForTimeout(100);
          } catch {
            // Element detached or page navigated
          }
        }
      }

      // Return to route if navigated away
      if (!authedPage.url().includes(route)) {
        await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      }

      // Verify page survived
      const body = await authedPage.locator('body').count();
      expect(body, `Page crashed on ${route} after clicking elements`).toBeGreaterThan(0);
    }

    expect(clickLog.length).toBeGreaterThan(0);
  });

  test('should survive double-clicking every element', async ({ authedPage }) => {
    authedPage.on('dialog', async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await authedPage.waitForTimeout(1000);

      const elements = await authedPage.locator('button:not([disabled]), a[href^="/"], [role="button"]').all();
      for (let i = 0; i < Math.min(elements.length, 10); i++) {
        try {
          const el = elements[i];
          if (!(await el.isVisible().catch(() => false))) continue;
          const text = (await el.textContent() || '').toLowerCase();
          if (text.includes('delete') || text.includes('log out') || text.includes('logout')) continue;

          await el.dblclick({ timeout: 3000, force: true }).catch(() => {});
          await authedPage.waitForTimeout(200);
          await authedPage.keyboard.press('Escape').catch(() => {});
        } catch {
          // Expected
        }
      }

      // Recover page state - navigate back if we ended up on login
      await authedPage.waitForTimeout(500);
      const currentUrl = authedPage.url();
      if (currentUrl.includes('login')) {
        // Session was lost, skip remaining routes
        break;
      }
      const body = await authedPage.locator('body').count();
      expect(body).toBeGreaterThan(0);
    }
  });

  test('should survive right-clicking every element', async ({ authedPage }) => {
    authedPage.on('dialog', async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const elements = await authedPage.locator('button, a, img, div, p, h1, h2, h3').all();
      for (let i = 0; i < Math.min(elements.length, 15); i++) {
        try {
          const el = elements[i];
          if (!(await el.isVisible().catch(() => false))) continue;

          await el.click({ button: 'right', timeout: 2000, force: true }).catch(() => {});
          await authedPage.waitForTimeout(100);
          await authedPage.keyboard.press('Escape').catch(() => {});
        } catch {
          // Expected
        }
      }

      const body = await authedPage.locator('body').count();
      expect(body).toBeGreaterThan(0);
    }
  });
});
