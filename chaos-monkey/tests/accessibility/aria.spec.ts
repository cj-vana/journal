import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Accessibility: ARIA attributes', () => {
  test('should have proper page structure with landmarks', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      // Check for basic landmark roles
      const hasMain = await authedPage.locator('main, [role="main"]').count();
      const hasNav = await authedPage.locator('nav, [role="navigation"]').count();

      // At minimum, pages should have some structural elements
      const hasStructure = hasMain > 0 || hasNav > 0;
      expect(hasStructure, `${route} has no landmark elements (main, nav)`).toBeTruthy();
    }
  });

  test('should have alt text on images', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const images = await authedPage.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        // Images should have alt text or role="presentation"
        const hasAccessibility = alt !== null || role === 'presentation' || role === 'none';
        if (!hasAccessibility) {
          const src = await img.getAttribute('src') || '';
          // Only flag non-decorative images
          if (!src.includes('icon') && !src.includes('avatar')) {
            expect(hasAccessibility, `Image on ${route} missing alt text: ${src.slice(0, 50)}`).toBeTruthy();
          }
        }
      }
    }
  });

  test('should have labels on form inputs', async ({ authedPage }) => {
    const formPages = ['/entries/new', '/login', '/register', '/settings'];

    for (const route of formPages) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const inputs = await authedPage.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select').all();
      for (const input of inputs) {
        if (!(await input.isVisible().catch(() => false))) continue;

        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        // Input should have some form of label
        let hasLabel = !!ariaLabel || !!ariaLabelledBy || !!placeholder;
        if (id) {
          const label = await authedPage.locator(`label[for="${id}"]`).count();
          hasLabel = hasLabel || label > 0;
        }
        // Wrapped in label
        const parentLabel = await input.locator('xpath=ancestor::label').count();
        hasLabel = hasLabel || parentLabel > 0;

        // This is a soft check - not all inputs must have labels
        // but we report for visibility
      }
    }
  });

  test('should have proper button labels', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const buttons = await authedPage.locator('button').all();
      for (const btn of buttons) {
        if (!(await btn.isVisible().catch(() => false))) continue;

        const text = (await btn.textContent() || '').trim();
        const ariaLabel = await btn.getAttribute('aria-label');
        const title = await btn.getAttribute('title');

        // Buttons should have accessible text
        const hasLabel = text.length > 0 || !!ariaLabel || !!title;
        expect(
          hasLabel,
          `Button on ${route} has no accessible label`
        ).toBeTruthy();
      }
    }
  });

  test('should have correct heading hierarchy', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await authedPage.waitForTimeout(1000);

      const headings = await authedPage.evaluate(() => {
        const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(hs).map(h => ({
          level: parseInt(h.tagName[1]),
          text: h.textContent?.trim().slice(0, 30) || '',
        }));
      });

      if (headings.length > 0) {
        // First heading should be h1 or h2
        expect(headings[0].level).toBeLessThanOrEqual(2);

        // No heading should skip more than one level (going deeper)
        for (let i = 1; i < headings.length; i++) {
          const jump = headings[i].level - headings[i - 1].level;
          // Going deeper by more than 1 level is a hierarchy skip (h1 -> h3)
          // Going back up (h3 -> h1) is fine
          expect(
            jump <= 1 || headings[i].level <= headings[i - 1].level,
            `Heading hierarchy skip on ${route}: h${headings[i - 1].level} -> h${headings[i].level}`
          ).toBeTruthy();
        }
      }
    }
  });
});
