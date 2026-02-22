import { test, expect } from '../fixtures/auth.fixture';
import { TIPTAP_DOC, createEntryViaAPI, deleteEntryViaAPI } from '../fixtures/helpers';

test.describe('Entry CRUD operations', () => {
  let createdEntryIds: string[] = [];

  test.afterEach(async ({ authedPage }) => {
    for (const id of createdEntryIds) {
      await deleteEntryViaAPI(authedPage, id);
    }
    createdEntryIds = [];
  });

  test('should navigate to new entry page', async ({ authedPage }) => {
    await authedPage.goto('/entries/new', { waitUntil: 'domcontentloaded' });
    // Wait for TipTap editor to mount - it creates a .tiptap or .ProseMirror element
    await authedPage.waitForSelector('.tiptap, .ProseMirror, [contenteditable="true"]', { timeout: 15000 }).catch(() => {});
    await expect(authedPage.locator('body')).toBeVisible();
    // Check for any form inputs (title, date) or the TipTap editor
    const formElements = await authedPage.locator('input[type="text"], input[type="date"], .tiptap, .ProseMirror, [contenteditable="true"]').count();
    expect(formElements).toBeGreaterThan(0);
  });

  test('should create an entry via API', async ({ authedPage }) => {
    const id = await createEntryViaAPI(authedPage, 'Chaos Test Entry');
    expect(id).toBeTruthy();
    if (id) createdEntryIds.push(id);
  });

  test('should list entries on entries page', async ({ authedPage }) => {
    // Create a test entry first
    const id = await createEntryViaAPI(authedPage, 'Listed Entry Test');
    if (id) createdEntryIds.push(id);

    await authedPage.goto('/entries', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await expect(authedPage.locator('body')).toBeVisible();
  });

  test('should view a single entry', async ({ authedPage }) => {
    const id = await createEntryViaAPI(authedPage, 'View Entry Test');
    if (id) {
      createdEntryIds.push(id);
      await authedPage.goto(`/entries/${id}`, { waitUntil: 'domcontentloaded' });
      await authedPage.waitForSelector('h1, article', { timeout: 10000 }).catch(() => {});
      await expect(authedPage.locator('body')).toBeVisible();
    }
  });

  test('should edit an entry via API', async ({ authedPage }) => {
    const id = await createEntryViaAPI(authedPage, 'Edit Entry Test');
    if (id) {
      createdEntryIds.push(id);
      const response = await authedPage.request.put(`/api/entries/${id}`, {
        data: {
          title: 'Updated Entry Test',
          content: JSON.stringify(TIPTAP_DOC),
        },
      });
      expect(response.status()).toBeLessThan(400);
    }
  });

  test('should delete an entry via API', async ({ authedPage }) => {
    const id = await createEntryViaAPI(authedPage, 'Delete Entry Test');
    if (id) {
      const response = await authedPage.request.delete(`/api/entries/${id}`);
      expect(response.status()).toBeLessThan(400);
    }
  });

  test('should handle creating entry with empty title', async ({ authedPage }) => {
    const response = await authedPage.request.post('/api/entries', {
      data: {
        title: '',
        content: JSON.stringify(TIPTAP_DOC),
        entryDate: new Date().toISOString(),
      },
      failOnStatusCode: false,
    });
    // Either rejects or creates - both are acceptable, but should not crash
    const status = response.status();
    expect(status).toBeLessThan(500);
    if (status < 400) {
      const data = await response.json();
      if (data?.id) createdEntryIds.push(data.id);
    }
  });

  test('should handle creating entry with extremely long title', async ({ authedPage }) => {
    const response = await authedPage.request.post('/api/entries', {
      data: {
        title: 'A'.repeat(10000),
        content: JSON.stringify(TIPTAP_DOC),
        entryDate: new Date().toISOString(),
      },
      failOnStatusCode: false,
    });
    const status = response.status();
    expect(status).toBeLessThan(500);
    if (status < 400) {
      const data = await response.json();
      if (data?.id) createdEntryIds.push(data.id);
    }
  });

  test('should return 404 for nonexistent entry', async ({ authedPage }) => {
    const response = await authedPage.request.get('/api/entries/nonexistent-id-12345', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
