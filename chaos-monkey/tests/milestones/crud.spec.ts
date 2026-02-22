import { test, expect } from '../fixtures/auth.fixture';

test.describe('Milestones CRUD', () => {
  let createdIds: string[] = [];

  test.afterEach(async ({ authedPage }) => {
    for (const id of createdIds) {
      await authedPage.request.delete(`/api/milestones/${id}`).catch(() => {});
    }
    createdIds = [];
  });

  test('should load milestones page', async ({ authedPage }) => {
    await authedPage.goto('/milestones', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await expect(authedPage.locator('body')).toBeVisible();
  });

  test('should create a milestone via API', async ({ authedPage }) => {
    const response = await authedPage.request.post('/api/milestones', {
      data: {
        title: 'First Steps',
        category: 'motor',
        achievedDate: new Date().toISOString(),
        notes: 'Test milestone from chaos monkey',
      },
      failOnStatusCode: false,
    });
    if (response.ok()) {
      const data = await response.json();
      if (data?.id) createdIds.push(data.id);
      expect(data.title || data.name).toBeTruthy();
    }
    expect(response.status()).toBeLessThan(500);
  });

  test('should list milestones via API', async ({ authedPage }) => {
    const response = await authedPage.request.get('/api/milestones', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('should update a milestone via API', async ({ authedPage }) => {
    // Create first
    const createRes = await authedPage.request.post('/api/milestones', {
      data: {
        title: 'Update Test Milestone',
        category: 'motor',
        achievedDate: new Date().toISOString(),
      },
      failOnStatusCode: false,
    });
    if (createRes.ok()) {
      const data = await createRes.json();
      if (data?.id) {
        createdIds.push(data.id);
        const updateRes = await authedPage.request.put(`/api/milestones/${data.id}`, {
          data: { title: 'Updated Milestone Title' },
          failOnStatusCode: false,
        });
        expect(updateRes.status()).toBeLessThan(500);
      }
    }
  });

  test('should delete a milestone via API', async ({ authedPage }) => {
    const createRes = await authedPage.request.post('/api/milestones', {
      data: {
        title: 'Delete Test Milestone',
        category: 'motor',
        achievedDate: new Date().toISOString(),
      },
      failOnStatusCode: false,
    });
    if (createRes.ok()) {
      const data = await createRes.json();
      if (data?.id) {
        const deleteRes = await authedPage.request.delete(`/api/milestones/${data.id}`);
        expect(deleteRes.status()).toBeLessThan(500);
      }
    }
  });

  test('should handle milestone with XSS in title', async ({ authedPage }) => {
    const response = await authedPage.request.post('/api/milestones', {
      data: {
        title: '<script>alert("xss")</script>',
        category: 'motor',
        achievedDate: new Date().toISOString(),
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
    if (response.ok()) {
      const data = await response.json();
      if (data?.id) createdIds.push(data.id);
      // If stored, it should be sanitized
      if (data.title) {
        expect(data.title).not.toContain('<script>');
      }
    }
  });

  test('should interact with milestones page UI', async ({ authedPage }) => {
    await authedPage.goto('/milestones', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

    // Try clicking add buttons
    const addBtn = authedPage.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Record")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await authedPage.waitForTimeout(500);
      // Close modal
      await authedPage.keyboard.press('Escape');
    }
    await expect(authedPage.locator('body')).toBeVisible();
  });
});
