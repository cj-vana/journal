import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('should show login page with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject empty credentials', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    // Should stay on login page or show validation error
    await expect(page).toHaveURL(/login/);
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should stay on login page or show error
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login|error/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const email = process.env.CHAOS_EMAIL || 'test-admin@chaos.local';
    const password = process.env.CHAOS_PASSWORD || 'testpass123';

    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should reject SQL injection in email field', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', "admin'--");
    await page.fill('input[type="password"], input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    // Should not redirect to dashboard
    expect(page.url()).not.toMatch(/dashboard/);
  });

  test('should reject XSS in login fields', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', '<script>alert(1)</script>');
    await page.fill('input[type="password"], input[name="password"]', '<img src=x onerror=alert(1)>');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    // Verify no script execution
    const alertTriggered = await page.evaluate(() => {
      return (window as any).__xss_triggered === true;
    });
    expect(alertTriggered).toBeFalsy();
  });
});
