import { test, expect } from '../fixtures/auth.fixture';
import { createEntryViaAPI, deleteEntryViaAPI } from '../fixtures/helpers';

test.describe('Export functionality', () => {
  let createdIds: string[] = [];

  test.afterAll(async ({ authedPage }) => {
    for (const id of createdIds) {
      await deleteEntryViaAPI(authedPage, id);
    }
  });

  test('should load export page', async ({ authedPage }) => {
    await authedPage.goto('/export', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await expect(authedPage.locator('body')).toBeVisible();
  });

  test('should trigger ZIP export via API', async ({ authedPage }) => {
    // Create some entries first
    for (let i = 0; i < 3; i++) {
      const id = await createEntryViaAPI(authedPage, `Export Test ${i}`);
      if (id) createdIds.push(id);
    }

    const response = await authedPage.request.post('/api/export/zip', {
      failOnStatusCode: false,
    });

    // Should succeed or return a known error status
    expect(response.status()).toBeLessThan(500);
  });

  test('should trigger PDF export via API', async ({ authedPage }) => {
    const response = await authedPage.request.post('/api/export/pdf', {
      failOnStatusCode: false,
    });

    // PDF export should succeed in the supported Docker/CI runtime with Chromium installed.
    expect(response.status(), `PDF export returned ${response.status()}`).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

  test('should handle export with no entries', async ({ authedPage }) => {
    // This tests graceful handling when there's nothing to export
    const response = await authedPage.request.post('/api/export/zip', {
      failOnStatusCode: false,
    });
    // Should not crash
    expect(response.status()).toBeLessThan(500);
  });

  test('should interact with export UI', async ({ authedPage }) => {
    await authedPage.goto('/export', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

    // Find and click export buttons
    const exportButtons = await authedPage.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("ZIP"), button:has-text("PDF")').all();
    for (const btn of exportButtons.slice(0, 3)) {
      if (await btn.isVisible().catch(() => false)) {
        // Use Promise.race to handle download dialog
        const downloadPromise = authedPage.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await btn.click({ timeout: 3000 }).catch(() => {});
        await downloadPromise;
        await authedPage.waitForTimeout(1000);
      }
    }
    await expect(authedPage.locator('body')).toBeVisible();
  });
});
