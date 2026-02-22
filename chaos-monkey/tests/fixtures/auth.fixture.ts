import { test as base, Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

export type AuthFixtures = {
  authedPage: Page;
  adminEmail: string;
  adminPassword: string;
};

async function loginOnPage(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);

  const emailInput = page.locator('#email');
  await emailInput.click();
  await emailInput.pressSequentially(email, { delay: 30 });

  const passwordInput = page.locator('#password');
  await passwordInput.click();
  await passwordInput.pressSequentially(password, { delay: 30 });

  await submitBtn.click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

export const test = base.extend<AuthFixtures>({
  adminEmail: [process.env.CHAOS_EMAIL || 'admin@example.com', { option: true }],
  adminPassword: [process.env.CHAOS_PASSWORD || 'password123', { option: true }],

  authedPage: async ({ browser, adminEmail, adminPassword }, use) => {
    let context;
    if (fs.existsSync(AUTH_FILE)) {
      context = await browser.newContext({ storageState: AUTH_FILE });
      // Verify the stored session is still valid
      const page = await context.newPage();
      await page.goto('/dashboard', { timeout: 30000 });
      // If redirected to login, session expired - re-auth
      if (page.url().includes('/login')) {
        await page.close();
        await context.close();
        context = await browser.newContext();
        const freshPage = await context.newPage();
        await loginOnPage(freshPage, adminEmail, adminPassword);
        await context.storageState({ path: AUTH_FILE });
        await freshPage.close();
      } else {
        await page.close();
      }
    } else {
      context = await browser.newContext();
      const page = await context.newPage();
      await loginOnPage(page, adminEmail, adminPassword);
      await context.storageState({ path: AUTH_FILE });
      await page.close();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
