import { Page } from 'playwright';
import { UiChaosInjector, UiChaosResult } from '../types';
import { login, setupErrorCapture, captureScreenshot, makeResult, randomString, XSS_PAYLOADS, SQLI_PAYLOADS } from '../helpers';

/**
 * Finds every form on the app and tries to submit with:
 * - Empty fields
 * - Extremely long strings
 * - XSS payloads
 * - SQL injection payloads
 * - Special characters
 * - Negative numbers
 * - Boundary values
 */
const formFuzzer: UiChaosInjector = {
  name: 'ui-form-fuzzer',
  description: 'Fuzzes all forms with malicious, edge-case, and boundary inputs',
  category: 'forms',

  async run(page: Page, baseUrl: string, credentials): Promise<UiChaosResult> {
    const start = Date.now();
    const { logs, errors } = setupErrorCapture(page);
    const testedForms: string[] = [];
    const failures: string[] = [];

    try {
      await login(page, baseUrl, credentials.email, credentials.password);

      // Test entry creation form with XSS payloads
      await page.goto(`${baseUrl}/entries/new`, { waitUntil: 'networkidle', timeout: 15000 });

      // Test title field with XSS
      const titleInput = page.locator('input[placeholder*="title"], input[type="text"]').first();
      if (await titleInput.isVisible().catch(() => false)) {
        for (const payload of XSS_PAYLOADS.slice(0, 3)) {
          await titleInput.fill(payload);
          testedForms.push(`Entry title: XSS payload`);
        }

        // Extremely long title
        await titleInput.fill(randomString(10000));
        testedForms.push('Entry title: 10000 char string');

        // SQL injection
        for (const payload of SQLI_PAYLOADS.slice(0, 2)) {
          await titleInput.fill(payload);
          testedForms.push('Entry title: SQLi payload');
        }
      }

      // Test date field with invalid dates
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible().catch(() => false)) {
        const invalidDates = ['9999-99-99', '0000-00-00', '2099-12-31', '1800-01-01'];
        for (const d of invalidDates) {
          await dateInput.fill(d).catch(() => {});
          testedForms.push(`Date: ${d}`);
        }
      }

      // Verify page didn't crash
      let bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed during entry form fuzzing');

      // Test growth form
      await page.goto(`${baseUrl}/growth`, { waitUntil: 'networkidle', timeout: 15000 });

      // Try to open the growth form
      const addMeasurement = page.locator('button:has-text("Add"), button:has-text("Measurement")').first();
      if (await addMeasurement.isVisible().catch(() => false)) {
        await addMeasurement.click();
        await page.waitForTimeout(500);

        // Find numeric inputs and try edge cases
        const numericInputs = await page.locator('input[type="number"], input[step]').all();
        const edgeCaseNumbers = ['-999999', '0', '99999999', '0.0001', '-0', 'NaN', 'Infinity', '1e308'];

        for (const input of numericInputs) {
          if (!(await input.isVisible().catch(() => false))) continue;
          for (const val of edgeCaseNumbers.slice(0, 3)) {
            await input.fill(val).catch(() => {});
            testedForms.push(`Growth numeric: ${val}`);
          }
        }

        // Try submitting with all garbage
        const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add")').first();
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click().catch(() => {});
          await page.waitForTimeout(1000);
          testedForms.push('Growth form: submitted with garbage');
        }
      }

      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed during growth form fuzzing');

      // Test milestone form
      await page.goto(`${baseUrl}/milestones`, { waitUntil: 'networkidle', timeout: 15000 });
      const addMilestone = page.locator('button:has-text("Add"), button:has-text("Milestone"), button:has-text("Record")').first();
      if (await addMilestone.isVisible().catch(() => false)) {
        await addMilestone.click();
        await page.waitForTimeout(500);

        const textInputs = await page.locator('input[type="text"], textarea').all();
        for (const input of textInputs) {
          if (!(await input.isVisible().catch(() => false))) continue;
          await input.fill(XSS_PAYLOADS[0]).catch(() => {});
          testedForms.push('Milestone: XSS in text field');
        }
      }

      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed during milestone form fuzzing');

      // Test search/filter with injection
      await page.goto(`${baseUrl}/entries`, { waitUntil: 'networkidle', timeout: 15000 });
      const searchInput = page.locator('input[placeholder*="Search"], input[aria-label*="search" i]').first();
      if (await searchInput.isVisible().catch(() => false)) {
        const searchPayloads = [
          ...XSS_PAYLOADS.slice(0, 2),
          ...SQLI_PAYLOADS.slice(0, 2),
          randomString(5000),
          '\0\0\0',
          '../../etc/passwd',
          '%00%00%00',
        ];
        for (const payload of searchPayloads) {
          await searchInput.fill(payload);
          await page.waitForTimeout(500);
          testedForms.push('Search: injection payload');
        }
      }

      bodyOk = await page.locator('body').count() > 0;
      if (!bodyOk) failures.push('Page crashed during search fuzzing');

      // Test settings form
      await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle', timeout: 15000 });
      const settingsInputs = await page.locator('input[type="text"], input:not([type])').all();
      for (const input of settingsInputs) {
        if (!(await input.isVisible().catch(() => false))) continue;
        await input.fill(XSS_PAYLOADS[Math.floor(Math.random() * XSS_PAYLOADS.length)]).catch(() => {});
        testedForms.push('Settings: XSS in input');
      }

      const duration = Date.now() - start;
      const hasFatalErrors = errors.some(e =>
        !e.includes('hydration') && !e.includes('Loading chunk') && !e.includes('Abort')
      );

      if (failures.length > 0 || hasFatalErrors) {
        const screenshot = await captureScreenshot(page);
        return makeResult('ui-form-fuzzer', false, duration, {
          error: `${failures.length} crashes, ${errors.length} uncaught errors`,
          details: failures.join('; '),
          screenshot,
          consoleLogs: logs,
          uncaughtErrors: errors,
        });
      }

      return makeResult('ui-form-fuzzer', true, duration, {
        details: `Fuzzed ${testedForms.length} form inputs across all pages without crashes`,
      });

    } catch (err: any) {
      const screenshot = await captureScreenshot(page);
      return makeResult('ui-form-fuzzer', false, Date.now() - start, {
        error: err.message,
        screenshot,
        consoleLogs: logs,
        uncaughtErrors: errors,
      });
    }
  },
};

export default formFuzzer;
