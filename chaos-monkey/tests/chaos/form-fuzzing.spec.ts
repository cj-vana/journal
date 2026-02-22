import { test, expect } from '../fixtures/auth.fixture';
import {
  XSS_PAYLOADS, SQLI_PAYLOADS, BOUNDARY_STRINGS,
  EDGE_CASE_NUMBERS, randomString, ALL_APP_ROUTES,
} from '../fixtures/helpers';

test.describe('Chaos: Form fuzzing', () => {
  test('should survive XSS payloads in every text input', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const inputs = await authedPage.locator('input[type="text"], input:not([type]), textarea, [contenteditable="true"]').all();
      for (const input of inputs.slice(0, 5)) {
        if (!(await input.isVisible().catch(() => false))) continue;

        for (const payload of XSS_PAYLOADS.slice(0, 3)) {
          try {
            const tag = await input.evaluate((el) => el.tagName);
            if (tag === 'DIV' || (await input.getAttribute('contenteditable')) === 'true') {
              await input.click();
              await authedPage.keyboard.type(payload, { delay: 5 });
            } else {
              await input.fill(payload);
            }
            await authedPage.waitForTimeout(100);
          } catch {
            // Input may have been removed
          }
        }
      }

      const body = await authedPage.locator('body').count();
      expect(body, `Page crashed on ${route} during XSS fuzzing`).toBeGreaterThan(0);

      // Verify no XSS executed
      const xssTriggered = await authedPage.evaluate(() => (window as any).__xss_triggered);
      expect(xssTriggered).toBeFalsy();
    }
  });

  test('should survive SQL injection payloads in every input', async ({ authedPage }) => {
    for (const route of ALL_APP_ROUTES) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const inputs = await authedPage.locator('input[type="text"], input:not([type]), textarea').all();
      for (const input of inputs.slice(0, 3)) {
        if (!(await input.isVisible().catch(() => false))) continue;

        for (const payload of SQLI_PAYLOADS) {
          try {
            await input.fill(payload);
            await authedPage.waitForTimeout(100);
          } catch {
            break;
          }
        }
      }

      const body = await authedPage.locator('body').count();
      expect(body).toBeGreaterThan(0);

      const bodyText = await authedPage.locator('body').textContent() || '';
      expect(bodyText).not.toMatch(/SQL|syntax error|PostgreSQL|MySQL|sqlite/i);
    }
  });

  test('should survive extremely long strings in inputs', async ({ authedPage }) => {
    await authedPage.goto('/entries/new', { waitUntil: 'domcontentloaded', timeout: 15000 });

    const inputs = await authedPage.locator('input[type="text"], input:not([type]), textarea').all();
    for (const input of inputs.slice(0, 3)) {
      if (!(await input.isVisible().catch(() => false))) continue;
      try {
        await input.fill(randomString(50000));
        await authedPage.waitForTimeout(200);
      } catch {
        // May timeout - that's ok
      }
    }

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive boundary strings in inputs', async ({ authedPage }) => {
    for (const route of ['/entries/new', '/milestones', '/growth', '/settings']) {
      await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

      const inputs = await authedPage.locator('input[type="text"], input:not([type])').all();
      for (const input of inputs.slice(0, 3)) {
        if (!(await input.isVisible().catch(() => false))) continue;
        for (const str of BOUNDARY_STRINGS.slice(0, 5)) {
          try {
            await input.fill(str);
            await authedPage.waitForTimeout(100);
          } catch {
            break;
          }
        }
      }

      const body = await authedPage.locator('body').count();
      expect(body).toBeGreaterThan(0);
    }
  });

  test('should survive edge case numbers in numeric inputs', async ({ authedPage }) => {
    await authedPage.goto('/growth', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Open add form
    const addBtn = authedPage.locator('button:has-text("Add"), button:has-text("Record"), button:has-text("Measurement")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await authedPage.waitForTimeout(500);
    }

    const numInputs = await authedPage.locator('input[type="number"]').all();
    for (const input of numInputs) {
      if (!(await input.isVisible().catch(() => false))) continue;
      for (const val of EDGE_CASE_NUMBERS) {
        try {
          await input.fill(val);
          await authedPage.waitForTimeout(100);
        } catch {
          break;
        }
      }
    }

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive submitting forms with all garbage data', async ({ authedPage }) => {
    await authedPage.goto('/entries/new', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Fill every input with garbage
    const allInputs = await authedPage.locator('input:visible, textarea:visible').all();
    for (const input of allInputs) {
      const type = await input.getAttribute('type');
      try {
        if (type === 'date') {
          await input.fill('9999-12-31');
        } else if (type === 'number') {
          await input.fill('-999999');
        } else if (type === 'email') {
          await input.fill('not-an-email');
        } else {
          await input.fill(XSS_PAYLOADS[0]);
        }
      } catch {
        // Some inputs may not be fillable
      }
    }

    // Try to submit
    const submitBtn = authedPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click().catch(() => {});
      await authedPage.waitForTimeout(2000);
    }

    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });
});
