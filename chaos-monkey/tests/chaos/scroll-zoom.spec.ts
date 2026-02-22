import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Chaos: Scroll and zoom', () => {
  test('should survive rapid scrolling on all pages', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 5)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      // Rapid scroll down
      for (let i = 0; i < 20; i++) {
        await authedPage.mouse.wheel(0, 500);
        await authedPage.waitForTimeout(30);
      }

      // Rapid scroll up
      for (let i = 0; i < 20; i++) {
        await authedPage.mouse.wheel(0, -500);
        await authedPage.waitForTimeout(30);
      }

      // Horizontal scroll
      for (let i = 0; i < 10; i++) {
        await authedPage.mouse.wheel(300, 0);
        await authedPage.waitForTimeout(30);
      }

      // Random direction scroll
      for (let i = 0; i < 20; i++) {
        await authedPage.mouse.wheel(
          Math.floor(Math.random() * 1000) - 500,
          Math.floor(Math.random() * 1000) - 500
        );
        await authedPage.waitForTimeout(20);
      }

      const body = await authedPage.locator('body').count();
      expect(body, `Page crashed on ${route} during rapid scrolling`).toBeGreaterThan(0);
    }
  });

  test('should survive zoom level changes', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];

    for (const zoom of zoomLevels) {
      await authedPage.evaluate((z) => {
        (document.body.style as any).zoom = z;
      }, zoom);
      await authedPage.waitForTimeout(200);
    }

    // Reset
    await authedPage.evaluate(() => {
      (document.body.style as any).zoom = 1;
    });

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive ctrl+scroll (pinch zoom simulation)', async ({ authedPage }) => {
    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Simulate ctrl+scroll (zoom)
    for (let i = 0; i < 10; i++) {
      await authedPage.keyboard.down('Control');
      await authedPage.mouse.wheel(0, 100);
      await authedPage.keyboard.up('Control');
      await authedPage.waitForTimeout(50);
    }

    for (let i = 0; i < 10; i++) {
      await authedPage.keyboard.down('Control');
      await authedPage.mouse.wheel(0, -100);
      await authedPage.keyboard.up('Control');
      await authedPage.waitForTimeout(50);
    }

    // Reset zoom with ctrl+0
    await authedPage.keyboard.press('Control+0');
    await authedPage.waitForTimeout(500);

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should handle scroll to extreme positions', async ({ authedPage }) => {
    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Scroll to absolute bottom
    await authedPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await authedPage.waitForTimeout(500);

    // Scroll to absolute top
    await authedPage.evaluate(() => window.scrollTo(0, 0));
    await authedPage.waitForTimeout(500);

    // Scroll to extreme right
    await authedPage.evaluate(() => window.scrollTo(document.body.scrollWidth, 0));
    await authedPage.waitForTimeout(500);

    // Negative scroll (should be clamped to 0)
    await authedPage.evaluate(() => window.scrollTo(-1000, -1000));
    await authedPage.waitForTimeout(500);

    // Absurdly large scroll
    await authedPage.evaluate(() => window.scrollTo(999999999, 999999999));
    await authedPage.waitForTimeout(500);

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });
});
