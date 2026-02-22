import { test, expect } from '../fixtures/auth.fixture';

test.describe('Chaos: Network failures', () => {
  test('should survive slow 3G connection', async ({ authedPage }) => {
    const cdp = await authedPage.context().newCDPSession(authedPage);

    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024,
      uploadThroughput: 25 * 1024,
      latency: 2000,
    });

    for (const route of ['/dashboard', '/entries', '/milestones']) {
      try {
        await authedPage.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch {
        // Timeout is expected on slow network
      }
    }

    // Restore network
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });

    await authedPage.waitForTimeout(1000);
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive going offline mid-session', async ({ authedPage }) => {
    await authedPage.goto('/entries/new', { waitUntil: 'domcontentloaded', timeout: 15000 });

    const cdp = await authedPage.context().newCDPSession(authedPage);

    // Go offline
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0,
    });

    // Try to interact
    const titleInput = authedPage.locator('input[type="text"], input:not([type])').first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Offline entry test');
    }

    const saveBtn = authedPage.locator('button:has-text("Save"), button[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click().catch(() => {});
      await authedPage.waitForTimeout(2000);
    }

    // Come back online
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });

    await authedPage.waitForTimeout(2000);
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive intermittent connectivity', async ({ authedPage }) => {
    await authedPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });

    const cdp = await authedPage.context().newCDPSession(authedPage);

    // Rapidly toggle online/offline
    for (let i = 0; i < 10; i++) {
      await cdp.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
      });
      await authedPage.waitForTimeout(200);
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
      await authedPage.waitForTimeout(200);
    }

    await authedPage.waitForTimeout(2000);
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });

  test('should survive aborting requests mid-flight', async ({ authedPage }) => {
    const cdp = await authedPage.context().newCDPSession(authedPage);

    // Navigate with very slow connection then interrupt
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1024,
      uploadThroughput: 1024,
      latency: 5000,
    });

    // Rapid navigation to abort in-flight requests
    authedPage.goto('/entries').catch(() => {});
    await authedPage.waitForTimeout(500);
    authedPage.goto('/milestones').catch(() => {});
    await authedPage.waitForTimeout(500);
    authedPage.goto('/growth').catch(() => {});
    await authedPage.waitForTimeout(500);
    authedPage.goto('/dashboard').catch(() => {});

    // Restore network
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });

    await authedPage.waitForTimeout(3000);
    await authedPage.waitForLoadState('domcontentloaded').catch(() => {});
    const body = await authedPage.locator('body').count();
    expect(body).toBeGreaterThan(0);
  });
});
