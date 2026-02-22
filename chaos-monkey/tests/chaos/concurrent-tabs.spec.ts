import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Chaos: Concurrent tabs', () => {
  test('should survive multiple tabs navigating simultaneously', async ({ authedPage }) => {
    const context = authedPage.context();
    const tabs = [authedPage];

    // Open 4 additional tabs
    for (let i = 0; i < 4; i++) {
      tabs.push(await context.newPage());
    }

    try {
      // Navigate all tabs to different pages simultaneously
      await Promise.all(
        tabs.map((tab, i) =>
          tab.goto(ALL_APP_ROUTES[i % ALL_APP_ROUTES.length], {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          }).catch(() => {})
        )
      );

      // Verify all tabs survived
      for (let i = 0; i < tabs.length; i++) {
        const body = await tabs[i].locator('body').count().catch(() => 0);
        expect(body, `Tab ${i} crashed during parallel navigation`).toBeGreaterThan(0);
      }

      // All tabs navigate to same page simultaneously
      await Promise.all(
        tabs.map((tab) =>
          tab.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
        )
      );

      // Verify again
      for (let i = 0; i < tabs.length; i++) {
        const body = await tabs[i].locator('body').count().catch(() => 0);
        expect(body, `Tab ${i} crashed during same-page navigation`).toBeGreaterThan(0);
      }

      // Concurrent form interactions
      const formRoutes = ['/entries/new', '/milestones', '/growth', '/settings', '/export'];
      await Promise.all(
        tabs.map((tab, i) =>
          tab.goto(formRoutes[i % formRoutes.length], {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          }).catch(() => {})
        )
      );

      await Promise.all(
        tabs.map(async (tab, i) => {
          try {
            const inputs = await tab.locator('input[type="text"], input:not([type])').all();
            for (const input of inputs.slice(0, 2)) {
              if (await input.isVisible().catch(() => false)) {
                await input.fill(`Tab ${i} concurrent write`).catch(() => {});
              }
            }
          } catch {
            // Tab may be in unexpected state
          }
        })
      );

      // Rapid tab switching
      for (let i = 0; i < 15; i++) {
        const tab = tabs[Math.floor(Math.random() * tabs.length)];
        await tab.bringToFront();
        await tab.waitForTimeout(50);
      }
    } finally {
      // Close extra tabs
      for (let i = 1; i < tabs.length; i++) {
        await tabs[i].close().catch(() => {});
      }
    }

    // Verify original tab works
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });
});
