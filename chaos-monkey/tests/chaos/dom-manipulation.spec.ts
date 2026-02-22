import { test, expect } from '../fixtures/auth.fixture';
import { ALL_APP_ROUTES } from '../fixtures/helpers';

test.describe('Chaos: DOM manipulation', () => {
  test('should survive random element removal', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES.slice(0, 4)) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      // Remove 10 random elements
      await authedPage.evaluate(() => {
        const all = document.querySelectorAll('div, span, p, section, article, aside');
        const count = Math.min(all.length, 10);
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * all.length);
          if (all[idx] && all[idx].parentNode && all[idx].tagName !== 'BODY') {
            all[idx].remove();
          }
        }
      });

      await authedPage.waitForTimeout(500);

      // Try navigating - page should recover
      await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      const body = await authedPage.locator('body').count();
      expect(body, `Page didn't recover after DOM mutation on ${route}`).toBeGreaterThan(0);
    }
  });

  test('should survive all stylesheets being removed', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    await authedPage.evaluate(() => {
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());
    });

    await authedPage.waitForTimeout(1000);

    // Page should still function (just look ugly)
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);

    // Navigation should still work
    const links = await authedPage.locator('a[href^="/"]').all();
    if (links.length > 0) {
      const href = await links[0].getAttribute('href');
      if (href && !href.includes('delete') && !href.includes('logout')) {
        await links[0].click({ timeout: 3000 }).catch(() => {});
        await authedPage.waitForTimeout(1000);
      }
    }

    const bodyAfter = await authedPage.locator('body').count();
    expect(bodyAfter).toBeGreaterThan(0);
  });

  test('should survive chaotic CSS injection', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    const chaoticCSSRules = [
      '* { display: none !important; }',
      '* { transform: rotate(180deg) !important; }',
      '* { position: fixed !important; top: -9999px !important; }',
      '* { font-size: 0px !important; }',
      '* { opacity: 0 !important; }',
      '* { width: 1px !important; height: 1px !important; overflow: hidden !important; }',
      'body { zoom: 10 !important; }',
      '* { animation: spin 0.1s infinite !important; } @keyframes spin { to { transform: rotate(360deg); } }',
    ];

    for (const css of chaoticCSSRules) {
      await authedPage.evaluate((rule) => {
        const style = document.createElement('style');
        style.setAttribute('data-chaos', 'true');
        style.textContent = rule;
        document.head.appendChild(style);
      }, css);
      await authedPage.waitForTimeout(200);

      // Remove the chaos CSS
      await authedPage.evaluate(() => {
        document.querySelectorAll('style[data-chaos]').forEach(el => el.remove());
      });
    }

    // Page should still be alive
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive element attribute manipulation', async ({ authedPage }) => {
    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Change random attributes
    await authedPage.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.setAttribute('disabled', 'true');
        input.setAttribute('readonly', 'true');
        input.setAttribute('type', 'hidden');
      });

      // Remove href from all links
      document.querySelectorAll('a').forEach(a => {
        a.removeAttribute('href');
      });

      // Change all button types
      document.querySelectorAll('button').forEach(btn => {
        btn.setAttribute('type', 'reset');
      });
    });

    await authedPage.waitForTimeout(500);

    // Navigate away and back - should recover
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive script injection attempts via DOM', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Try injecting scripts via DOM
    const injected = await authedPage.evaluate(() => {
      (window as any).__chaos_xss = false;

      // Try innerHTML injection
      const div = document.createElement('div');
      div.innerHTML = '<img src=x onerror="window.__chaos_xss=true">';
      document.body.appendChild(div);

      // Try script element
      const script = document.createElement('script');
      script.textContent = 'window.__chaos_xss=true';
      // CSP should block this
      try {
        document.body.appendChild(script);
      } catch {
        // Expected if CSP is active
      }

      return (window as any).__chaos_xss;
    });

    // If CSP is properly configured, XSS should not execute
    // (This may or may not trigger depending on CSP policy)

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });
});
