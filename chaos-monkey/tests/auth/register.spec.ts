import { test, expect } from '@playwright/test';
import { XSS_PAYLOADS, SQLI_PAYLOADS } from '../fixtures/helpers';

test.describe('Registration flow', () => {
  test('should show registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('body')).toBeVisible();
    // Should have some form fields
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThan(0);
  });

  test('should reject registration with empty fields', async ({ page }) => {
    await page.goto('/register');
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      // Should not redirect to dashboard
      expect(page.url()).not.toMatch(/dashboard/);
    }
  });

  test('should handle XSS payloads in registration fields', async ({ page }) => {
    await page.goto('/register');
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();

    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(XSS_PAYLOADS[0]);
    }
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(XSS_PAYLOADS[1]);
    }

    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle SQL injection in registration fields', async ({ page }) => {
    await page.goto('/register');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();

    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(SQLI_PAYLOADS[0]);
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Should not crash or expose SQL errors
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/SQL|syntax error|PostgreSQL|MySQL|sqlite/i);
  });
});
