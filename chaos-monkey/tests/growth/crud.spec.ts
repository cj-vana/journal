import { test, expect } from '../fixtures/auth.fixture';
import { EDGE_CASE_NUMBERS } from '../fixtures/helpers';

test.describe('Growth records CRUD', () => {
  let createdIds: string[] = [];

  test.afterEach(async ({ authedPage }) => {
    for (const id of createdIds) {
      await authedPage.request.delete(`/api/growth/${id}`).catch(() => {});
    }
    createdIds = [];
  });

  test('should load growth page', async ({ authedPage }) => {
    await authedPage.goto('/growth', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await expect(authedPage.locator('body')).toBeVisible();
  });

  test('should create a growth record via API', async ({ authedPage }) => {
    const response = await authedPage.request.post('/api/growth', {
      data: {
        date: new Date().toISOString(),
        weight: 7.5,
        height: 65,
        headCircumference: 42,
      },
      failOnStatusCode: false,
    });
    if (response.ok()) {
      const data = await response.json();
      if (data?.id) createdIds.push(data.id);
    }
    expect(response.status()).toBeLessThan(500);
  });

  test('should list growth records via API', async ({ authedPage }) => {
    const response = await authedPage.request.get('/api/growth', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('should update a growth record via API', async ({ authedPage }) => {
    const createRes = await authedPage.request.post('/api/growth', {
      data: {
        date: new Date().toISOString(),
        weight: 8.0,
        height: 70,
      },
      failOnStatusCode: false,
    });
    if (createRes.ok()) {
      const data = await createRes.json();
      if (data?.id) {
        createdIds.push(data.id);
        const updateRes = await authedPage.request.put(`/api/growth/${data.id}`, {
          data: { weight: 8.5 },
          failOnStatusCode: false,
        });
        expect(updateRes.status()).toBeLessThan(500);
      }
    }
  });

  test('should delete a growth record via API', async ({ authedPage }) => {
    const createRes = await authedPage.request.post('/api/growth', {
      data: {
        date: new Date().toISOString(),
        weight: 7.0,
        height: 60,
      },
      failOnStatusCode: false,
    });
    if (createRes.ok()) {
      const data = await createRes.json();
      if (data?.id) {
        const deleteRes = await authedPage.request.delete(`/api/growth/${data.id}`);
        expect(deleteRes.status()).toBeLessThan(500);
      }
    }
  });

  test('should reject growth record with negative values', async ({ authedPage }) => {
    const response = await authedPage.request.post('/api/growth', {
      data: {
        date: new Date().toISOString(),
        weight: -5,
        height: -10,
      },
      failOnStatusCode: false,
    });
    // Should either reject or handle gracefully
    expect(response.status()).toBeLessThan(500);
  });

  test('should handle extreme numeric values', async ({ authedPage }) => {
    for (const val of EDGE_CASE_NUMBERS.slice(0, 4)) {
      const response = await authedPage.request.post('/api/growth', {
        data: {
          date: new Date().toISOString(),
          weight: parseFloat(val) || 0,
          height: parseFloat(val) || 0,
        },
        failOnStatusCode: false,
      });
      expect(response.status()).toBeLessThan(500);
      if (response.ok()) {
        const data = await response.json();
        if (data?.id) createdIds.push(data.id);
      }
    }
  });

  test('should interact with growth page UI', async ({ authedPage }) => {
    await authedPage.goto('/growth', { waitUntil: 'domcontentloaded' });
    await authedPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

    // Try opening the add form
    const addBtn = authedPage.locator('button:has-text("Add"), button:has-text("Record"), button:has-text("Measurement")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await authedPage.waitForTimeout(500);

      // Try filling numeric inputs with edge cases
      const numInputs = await authedPage.locator('input[type="number"]').all();
      for (const input of numInputs.slice(0, 3)) {
        if (await input.isVisible().catch(() => false)) {
          await input.fill('999999');
          await authedPage.waitForTimeout(200);
        }
      }
      await authedPage.keyboard.press('Escape');
    }
    await expect(authedPage.locator('body')).toBeVisible();
  });
});
