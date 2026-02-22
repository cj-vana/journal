import { test, expect } from '../fixtures/auth.fixture';
import { ROUTES } from '../fixtures/helpers';

test.describe('Settings - Name and Title Updates', () => {
  test('changing child name updates sidebar and dashboard', async ({ authedPage: page }) => {
    // Navigate to settings
    await page.goto(ROUTES.settings, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Get current child name from input
    const childNameInput = page.locator('input[placeholder="Baby"]');
    await childNameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Clear and type a new name
    const testName = `TestChild_${Date.now()}`;
    await childNameInput.fill(testName);

    // Submit the form
    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.click();

    // Wait for success message
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 10000 });

    // The page should refresh server data - check that the sidebar now shows the new name
    // Wait a moment for router.refresh() to complete
    await page.waitForTimeout(2000);

    // Navigate to dashboard to verify the name appears in the sidebar
    await page.goto(ROUTES.dashboard, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // The sidebar subtitle shows the child name
    const sidebarContent = await page.textContent('aside');
    expect(sidebarContent).toContain(testName);

    // Clean up: restore original name
    await page.goto(ROUTES.settings, { waitUntil: 'networkidle' });
    await childNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await childNameInput.fill('Baby');
    await saveBtn.click();
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 10000 });
  });

  test('changing app title updates sidebar header', async ({ authedPage: page }) => {
    await page.goto(ROUTES.settings, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const titleInput = page.locator('input[placeholder="Our Journal"]');
    await titleInput.waitFor({ state: 'visible', timeout: 10000 });

    const testTitle = `TestJournal_${Date.now()}`;
    await titleInput.fill(testTitle);

    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.click();

    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // The sidebar should reflect the new title after router.refresh()
    // The title is in the sidebar header, not the nav element
    const sidebarContent = await page.textContent('aside');
    expect(sidebarContent).toContain(testTitle);

    // Clean up
    await titleInput.fill('Our Journal');
    await saveBtn.click();
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 10000 });
  });

  test('changing color theme updates UI accent colors', async ({ authedPage: page }) => {
    // Use a wide viewport so the settings form is fully visible
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(ROUTES.settings, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Find the color theme buttons (use text content selector)
    const boyButton = page.getByRole('button', { name: 'Boy' });
    await boyButton.waitFor({ state: 'visible', timeout: 10000 });
    await boyButton.click();

    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.click();
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // After refresh, check that the data-theme attribute changed
    const themeAttr = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(themeAttr).toBe('boy');

    // Restore to neutral
    const neutralButton = page.getByRole('button', { name: 'No Preference' });
    await neutralButton.click();
    await saveBtn.click();
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Settings - Setup Wizard', () => {
  test('setup page redirects authenticated users to dashboard', async ({ authedPage: page }) => {
    await page.goto(ROUTES.setup, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Should be redirected to dashboard (already authenticated + setup done)
    expect(page.url()).toContain('/dashboard');
  });

  test('setup API returns needsSetup false when users exist', async ({ authedPage: page }) => {
    const response = await page.request.get('/api/setup');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.needsSetup).toBe(false);
  });

  test('setup API rejects POST when users already exist', async ({ authedPage: page }) => {
    const response = await page.request.post('/api/setup', {
      data: {
        name: 'Attacker',
        email: 'attacker@evil.com',
        password: 'password123',
      },
    });
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('already completed');
  });
});
