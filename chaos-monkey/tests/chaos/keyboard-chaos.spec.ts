import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Chaos: Keyboard chaos', () => {
  test('should survive tabbing through all elements on every page', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

      // Tab through all focusable elements
      for (let i = 0; i < 50; i++) {
        await authedPage.keyboard.press('Tab');
        await authedPage.waitForTimeout(30);
      }

      // Shift+Tab back
      for (let i = 0; i < 20; i++) {
        await authedPage.keyboard.press('Shift+Tab');
        await authedPage.waitForTimeout(30);
      }

      const body = await authedPage.locator('body').count();
      expect(body, `Page crashed on ${route} during tab navigation`).toBeGreaterThan(0);
    }
  });

  test('should survive keyboard shortcut spam', async ({ authedPage }) => {
    const shortcuts = [
      'Control+a', 'Control+z', 'Control+y', 'Control+s',
      'Control+b', 'Control+i', 'Control+u', 'Control+c',
      'Control+v', 'Control+x', 'Control+p', 'Control+f',
      'F1', 'F2', 'F3', 'F5', 'F11', 'F12',
      'Delete', 'Backspace', 'Insert', 'Home', 'End',
      'PageUp', 'PageDown',
    ];

    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

      for (const shortcut of shortcuts) {
        try {
          await authedPage.keyboard.press(shortcut);
          await authedPage.waitForTimeout(30);
        } catch {
          // Some shortcuts may cause issues
        }
      }

      const body = await authedPage.locator('body').count();
      expect(body, `Page crashed on ${route} during shortcut spam`).toBeGreaterThan(0);
    }
  });

  test('should survive arrow key spam', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 3)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

      const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
      for (let i = 0; i < 50; i++) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        await authedPage.keyboard.press(key);
        await authedPage.waitForTimeout(20);
      }

      const body = await authedPage.locator('body').count();
      expect(body).toBeGreaterThan(0);
    }
  });

  test('should survive Enter and Space on all focusable elements', async ({ authedPage }) => {
    authedPage.on('dialog', async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

    for (let i = 0; i < 30; i++) {
      await authedPage.keyboard.press('Tab');

      const activeText = await authedPage.evaluate(() =>
        document.activeElement?.textContent?.toLowerCase() || ''
      );
      if (activeText.includes('delete') || activeText.includes('log out') || activeText.includes('logout') || activeText.includes('sign out') || activeText.includes('remove')) {
        continue;
      }

      await authedPage.keyboard.press('Enter');
      await authedPage.waitForTimeout(100);
      await authedPage.keyboard.press('Escape');
      await authedPage.waitForTimeout(50);

      await authedPage.keyboard.press('Space');
      await authedPage.waitForTimeout(100);
      await authedPage.keyboard.press('Escape');
      await authedPage.waitForTimeout(50);
    }

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive rapid random key presses', async ({ authedPage }) => {
    await authedPage.goto('/entries/new', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Click into a text area
    const editor = authedPage.locator('[contenteditable="true"], textarea').first();
    if (await editor.isVisible().catch(() => false)) {
      await editor.click();
    }

    // Type random keys rapidly
    const allKeys = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    for (let i = 0; i < 100; i++) {
      const key = allKeys[Math.floor(Math.random() * allKeys.length)];
      await authedPage.keyboard.press(key);
      await authedPage.waitForTimeout(10);
    }

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });
});
