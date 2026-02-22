import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Accessibility: Keyboard navigation', () => {
  test('should be able to reach all interactive elements via Tab', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      // Wait for page content to render (sidebar or main content)
      await authedPage.waitForSelector('nav, main, button, a[href]', { timeout: 10000 }).catch(() => {});
      await authedPage.waitForTimeout(1000);

      const focusedElements: string[] = [];

      for (let i = 0; i < 60; i++) {
        await authedPage.keyboard.press('Tab');

        const focused = await authedPage.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          return {
            tag: el.tagName,
            role: el.getAttribute('role') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            tabIndex: el.getAttribute('tabindex') || '',
          };
        });

        if (!focused) break;
        focusedElements.push(`${focused.tag}[role=${focused.role}]`);
      }

      // Every page should have at least some focusable elements
      expect(
        focusedElements.length,
        `${route} has no focusable elements for keyboard navigation`
      ).toBeGreaterThan(0);
    }
  });

  test('should have visible focus indicators', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      // Tab to first interactive element
      await authedPage.keyboard.press('Tab');

      const hasFocusStyle = await authedPage.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return true; // No elements to check
        const styles = window.getComputedStyle(el);
        const outline = styles.outline || '';
        const boxShadow = styles.boxShadow || '';
        // Check if there's some visible focus indicator
        return outline.length > 0 && outline !== 'none' || boxShadow.length > 0 && boxShadow !== 'none';
      });

      expect(hasFocusStyle, `${route} has no visible focus indicator`).toBeTruthy();
    }
  });

  test('should close modals with Escape key', async ({ authedPage }) => {
    const pagesWithModals = ['/entries', '/milestones', '/growth'];

    for (const route of pagesWithModals) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      // Try to open a modal/dialog
      const addBtn = authedPage.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await authedPage.waitForTimeout(500);

        // Check if modal is open
        const modal = authedPage.locator('[role="dialog"], .modal, [data-radix-dialog-content]').first();
        const modalVisible = await modal.isVisible().catch(() => false);

        if (modalVisible) {
          await authedPage.keyboard.press('Escape');
          await authedPage.waitForTimeout(500);

          // Modal should be closed
          const stillVisible = await modal.isVisible().catch(() => false);
          expect(stillVisible, `Modal on ${route} did not close with Escape`).toBeFalsy();
        }
      }
    }
  });
});
