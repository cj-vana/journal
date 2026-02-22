import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Chaos: Pure monkey testing', () => {
  test('should survive 200 random actions across all pages', async ({ authedPage }) => {
    let totalActions = 0;

    authedPage.on('dialog', async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    const actionTypes = ['click', 'type', 'scroll', 'hover', 'dblclick', 'rightclick'] as const;

    for (let round = 0; round < 8; round++) {
      const route = ALL_APP_ROUTES[Math.floor(Math.random() * ALL_APP_ROUTES.length)];
      try {
        await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 });
      } catch {
        continue;
      }

      for (let action = 0; action < 25; action++) {
        const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        const viewport = authedPage.viewportSize() || { width: 1280, height: 720 };
        const x = Math.floor(Math.random() * viewport.width);
        const y = Math.floor(Math.random() * viewport.height);

        try {
          switch (actionType) {
            case 'click':
              await authedPage.mouse.click(x, y);
              break;
            case 'dblclick':
              await authedPage.mouse.dblclick(x, y);
              break;
            case 'rightclick':
              await authedPage.mouse.click(x, y, { button: 'right' });
              break;
            case 'type': {
              await authedPage.mouse.click(x, y);
              const chars = String.fromCharCode(
                ...Array.from({ length: 1 + Math.floor(Math.random() * 10) },
                  () => 32 + Math.floor(Math.random() * 95))
              );
              await authedPage.keyboard.type(chars, { delay: 5 });
              break;
            }
            case 'scroll':
              await authedPage.mouse.wheel(
                Math.floor(Math.random() * 600) - 300,
                Math.floor(Math.random() * 600) - 300
              );
              break;
            case 'hover':
              await authedPage.mouse.move(x, y);
              break;
          }
          totalActions++;
        } catch {
          // Expected - some actions will fail
        }

        await authedPage.waitForTimeout(30 + Math.floor(Math.random() * 100));
      }

      // Check page survived
      await authedPage.waitForTimeout(500);
      const body = await authedPage.locator('body').count();
      expect(body, `Page crashed after monkey testing round ${round} on ${route}`).toBeGreaterThan(0);

      // Dismiss any open dialogs/modals
      await authedPage.keyboard.press('Escape').catch(() => {});
    }

    expect(totalActions).toBeGreaterThan(50);
  });
});
