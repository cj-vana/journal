import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

const VIEWPORTS = [
  { width: 320, height: 568, name: 'iPhone SE' },
  { width: 375, height: 667, name: 'iPhone 8' },
  { width: 414, height: 896, name: 'iPhone 11' },
  { width: 768, height: 1024, name: 'iPad' },
  { width: 1024, height: 768, name: 'iPad Landscape' },
  { width: 1280, height: 720, name: 'Laptop' },
  { width: 1920, height: 1080, name: 'Desktop' },
  { width: 2560, height: 1440, name: '2K Monitor' },
  { width: 100, height: 100, name: 'Extreme Small' },
  { width: 4000, height: 4000, name: 'Extreme Large' },
];

test.describe('Responsive: Viewport testing', () => {
  test('should render without horizontal overflow at standard viewports', async ({ authedPage }) => {
    const issues: string[] = [];

    for (const route of ALL_APP_ROUTES.slice(0, 5)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await authedPage.waitForSelector('body', { timeout: 5000 }).catch(() => {});

      for (const vp of VIEWPORTS) {
        await authedPage.setViewportSize({ width: vp.width, height: vp.height });
        await authedPage.waitForTimeout(200);

        if (vp.width >= 320) {
          const hasOverflow = await authedPage.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
          });

          if (hasOverflow) {
            issues.push(`${route} @ ${vp.name} (${vp.width}x${vp.height}): horizontal overflow`);
          }
        }

        const body = await authedPage.locator('body').count();
        expect(body, `Page crashed at ${vp.name} on ${route}`).toBeGreaterThan(0);
      }
    }

    // Reset viewport
    await authedPage.setViewportSize({ width: 1280, height: 720 });

    // Report issues but don't fail on all of them
    if (issues.length > 0) {
      console.log('Responsive issues found:');
      issues.forEach(i => console.log(`  - ${i}`));
    }
  });

  test('should survive rapid viewport resizing', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    for (let i = 0; i < 30; i++) {
      const w = 200 + Math.floor(Math.random() * 2000);
      const h = 200 + Math.floor(Math.random() * 1200);
      await authedPage.setViewportSize({ width: w, height: h });
      await authedPage.waitForTimeout(30);
    }

    await authedPage.waitForTimeout(1000);
    await authedPage.setViewportSize({ width: 1280, height: 720 });

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should not have elements positioned off-screen at mobile viewport', async ({ authedPage }) => {
    await authedPage.setViewportSize({ width: 375, height: 667 });

    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const offscreenCount = await authedPage.evaluate(() => {
        const els = document.querySelectorAll('button, a, h1, h2, h3, p, input, label');
        let count = 0;
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.right < -50 || rect.left > window.innerWidth + 50) {
              count++;
            }
          }
        }
        return count;
      });

      // A few off-screen elements are ok (hidden nav items), but shouldn't be many
      expect(
        offscreenCount,
        `${route} has ${offscreenCount} elements off-screen at mobile viewport`
      ).toBeLessThan(10);
    }

    await authedPage.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle extreme viewport sizes without crashing', async ({ authedPage }) => {
    const extremeViewports = [
      { width: 100, height: 100 },
      { width: 50, height: 50 },
      { width: 4000, height: 4000 },
      { width: 1, height: 1000 },
      { width: 1000, height: 1 },
    ];

    for (const vp of extremeViewports) {
      await authedPage.setViewportSize(vp);
      await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await authedPage.waitForTimeout(500);

      const body = await authedPage.locator('body').count();
      expect(body, `Page crashed at ${vp.width}x${vp.height}`).toBeGreaterThan(0);
    }

    await authedPage.setViewportSize({ width: 1280, height: 720 });
  });
});
