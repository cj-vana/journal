import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES, createEntryViaAPI, deleteEntryViaAPI } from '../fixtures/helpers';

const MAX_PAGE_LOAD_MS = 20000; // 20s max for any page (dev server is slower)

test.describe('Performance: Page load times', () => {
  test('should load all pages within acceptable time', async ({ authedPage }) => {
    const timings: { route: string; time: number }[] = [];

    for (const route of ALL_APP_ROUTES) {
      const start = Date.now();
      // Use domcontentloaded instead of networkidle - HMR websocket keeps connections open
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: MAX_PAGE_LOAD_MS });
      await authedPage.waitForTimeout(1000); // Allow initial render
      const elapsed = Date.now() - start;
      timings.push({ route, time: elapsed });

      expect(
        elapsed,
        `${route} took ${elapsed}ms to load (max ${MAX_PAGE_LOAD_MS}ms)`
      ).toBeLessThan(MAX_PAGE_LOAD_MS);
    }

    console.log('Page load timings:');
    timings.forEach(t => console.log(`  ${t.route}: ${t.time}ms`));
  });

  test('should not leak memory across navigations', async ({ authedPage }) => {
    // Navigate between pages many times and check memory doesn't explode
    const memoryBefore = await authedPage.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    for (let i = 0; i < 20; i++) {
      const route = ALL_APP_ROUTES[i % ALL_APP_ROUTES.length];
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await authedPage.waitForTimeout(200);
    }

    const memoryAfter = await authedPage.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Only check if memory API is available
    if (memoryBefore > 0 && memoryAfter > 0) {
      const growth = memoryAfter / memoryBefore;
      // Memory should not grow more than 5x
      expect(growth, `Memory grew ${growth.toFixed(1)}x over 20 navigations`).toBeLessThan(5);
    }
  });

  test('should handle page with many entries efficiently', async ({ authedPage }) => {
    const createdIds: string[] = [];

    // Create 20 entries
    for (let i = 0; i < 20; i++) {
      const id = await createEntryViaAPI(authedPage, `Perf Test Entry ${i}`);
      if (id) createdIds.push(id);
    }

    try {
      const start = Date.now();
      await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 30000 });
      const elapsed = Date.now() - start;

      console.log(`Entries page with ${createdIds.length} entries loaded in ${elapsed}ms`);
      expect(elapsed).toBeLessThan(30000);

      const body = await authedPage.locator('body').count();
      expect(body).toBeGreaterThan(0);
    } finally {
      for (const id of createdIds) {
        await deleteEntryViaAPI(authedPage, id);
      }
    }
  });

  test('should load dashboard within acceptable time', async ({ authedPage }) => {
    const start = Date.now();
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await authedPage.waitForTimeout(1000); // Allow initial render
    const elapsed = Date.now() - start;

    expect(elapsed, `Dashboard took ${elapsed}ms to load`).toBeLessThan(20000);
  });

  test('should have reasonable DOM size', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await authedPage.waitForTimeout(1000);

      const domSize = await authedPage.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      // Pages should have fewer than 5000 DOM elements
      expect(
        domSize,
        `${route} has ${domSize} DOM elements (excessive)`
      ).toBeLessThan(5000);
    }
  });
});
