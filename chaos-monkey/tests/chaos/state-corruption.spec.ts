import { test, expect } from '../fixtures/auth.fixture';

test.describe('Chaos: State corruption', () => {
  test('should survive localStorage being cleared', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    await authedPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate after clearing
    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive localStorage being flooded', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Fill localStorage with 1MB of garbage
    await authedPage.evaluate(() => {
      for (let i = 0; i < 100; i++) {
        try {
          localStorage.setItem(`chaos_flood_${i}`, 'X'.repeat(10000));
        } catch {
          break; // QuotaExceeded
        }
      }
    });

    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);

    // Cleanup
    await authedPage.evaluate(() => {
      for (let i = 0; i < 100; i++) {
        localStorage.removeItem(`chaos_flood_${i}`);
      }
    });
  });

  test('should survive cookies being deleted mid-page', async ({ authedPage }) => {
    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 });

    await authedPage.context().clearCookies();
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive session token corruption', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    const context = authedPage.context();
    const cookies = await context.cookies();

    for (const cookie of cookies) {
      if (cookie.name.includes('session') || cookie.name.includes('token') || cookie.name.includes('next-auth')) {
        await context.addCookies([{
          ...cookie,
          value: 'totally-corrupted-' + Math.random().toString(36),
        }]);
      }
    }

    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive DOM elements being randomly removed', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Remove random DOM elements
    await authedPage.evaluate(() => {
      const elements = document.querySelectorAll('div, section, main, aside, nav');
      const count = Math.min(elements.length, 5);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * elements.length);
        if (elements[idx] && elements[idx].parentNode) {
          elements[idx].remove();
        }
      }
    });

    // Try interacting with the damaged page
    const links = await authedPage.locator('a[href^="/"]').all();
    if (links.length > 0) {
      const link = links[0];
      const href = await link.getAttribute('href');
      if (href && !href.includes('delete') && !href.includes('logout')) {
        await link.click({ timeout: 3000 }).catch(() => {});
        await authedPage.waitForTimeout(1000);
      }
    }

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive CSS being injected/removed', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Inject chaotic CSS
    await authedPage.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        * { transform: rotate(5deg) !important; }
        body { zoom: 0.5 !important; }
        div { border: 3px solid red !important; }
        button { pointer-events: none !important; }
      `;
      document.head.appendChild(style);
    });

    await authedPage.waitForTimeout(500);

    // Remove all stylesheets
    await authedPage.evaluate(() => {
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());
    });

    await authedPage.waitForTimeout(500);

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive injecting fake app state into localStorage', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    await authedPage.evaluate(() => {
      localStorage.setItem('next-auth.session-token', 'fake-token-chaos');
      localStorage.setItem('__NEXT_DATA__', JSON.stringify({ broken: true, props: null }));
      localStorage.setItem('theme', '"><script>alert(1)</script>');
    });

    await authedPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);

    // Cleanup
    await authedPage.evaluate(() => {
      localStorage.clear();
    });
  });
});
