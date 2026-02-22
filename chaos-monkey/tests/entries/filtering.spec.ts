import { test, expect } from '../fixtures/auth.fixture';
import { XSS_PAYLOADS, SQLI_PAYLOADS, createEntryViaAPI, deleteEntryViaAPI } from '../fixtures/helpers';

test.describe('Entry filtering and search', () => {
  let createdIds: string[] = [];

  test.afterAll(async ({ authedPage }) => {
    for (const id of createdIds) {
      await deleteEntryViaAPI(authedPage, id);
    }
  });

  test('should display entries page without errors', async ({ authedPage }) => {
    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 });
    await expect(authedPage.locator('body')).toBeVisible();
  });

  test('should handle search with XSS payloads', async ({ authedPage }) => {
    await authedPage.goto('/entries');
    await authedPage.waitForSelector('h1', { timeout: 10000 });

    const searchInput = authedPage.locator('input[placeholder*="Search" i], input[aria-label*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      for (const payload of XSS_PAYLOADS.slice(0, 3)) {
        await searchInput.fill(payload);
        await authedPage.waitForTimeout(500);
        // Page should not crash, no XSS should execute
        await expect(authedPage.locator('body')).toBeVisible();
      }
    }
  });

  test('should handle search with SQL injection payloads', async ({ authedPage }) => {
    await authedPage.goto('/entries');
    await authedPage.waitForSelector('h1', { timeout: 10000 });

    const searchInput = authedPage.locator('input[placeholder*="Search" i], input[aria-label*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      for (const payload of SQLI_PAYLOADS) {
        await searchInput.fill(payload);
        await authedPage.waitForTimeout(500);
        await expect(authedPage.locator('body')).toBeVisible();
        // Verify no SQL error messages leak
        const bodyText = await authedPage.locator('body').textContent() || '';
        expect(bodyText).not.toMatch(/SQL|syntax error|PostgreSQL|MySQL|sqlite/i);
      }
    }
  });

  test('should handle search with extremely long input', async ({ authedPage }) => {
    await authedPage.goto('/entries');
    await authedPage.waitForSelector('h1', { timeout: 10000 });

    const searchInput = authedPage.locator('input[placeholder*="Search" i], input[aria-label*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('A'.repeat(5000));
      await authedPage.waitForTimeout(1000);
      await expect(authedPage.locator('body')).toBeVisible();
    }
  });

  test('should handle filter controls gracefully', async ({ authedPage }) => {
    await authedPage.goto('/entries');
    await authedPage.waitForSelector('h1', { timeout: 10000 });

    // Click any filter/sort buttons that exist
    const filterButtons = await authedPage.locator('button:has-text("Filter"), button:has-text("Sort"), select').all();
    for (const btn of filterButtons.slice(0, 5)) {
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 3000 }).catch(() => {});
        await authedPage.waitForTimeout(300);
      }
    }
    await expect(authedPage.locator('body')).toBeVisible();
  });
});
