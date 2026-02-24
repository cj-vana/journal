import { test, expect } from '../fixtures/auth.fixture';
import {
  enableShowerMode,
  disableShowerMode,
  submitGuestMessage,
  XSS_PAYLOADS,
  SQLI_PAYLOADS,
} from '../fixtures/helpers';

test.describe('Baby Shower Guestbook', () => {
  test.describe('Admin Config', () => {
    test('can enable and disable shower mode via API', async ({ authedPage }) => {
      // Enable
      const enableRes = await authedPage.request.put('/api/shower/config', {
        data: { enabled: true },
      });
      expect(enableRes.ok()).toBe(true);
      const enableData = await enableRes.json();
      expect(enableData.showerEnabled).toBe(true);
      expect(enableData.showerCode).toBeTruthy();

      // Disable
      const disableRes = await authedPage.request.put('/api/shower/config', {
        data: { enabled: false },
      });
      expect(disableRes.ok()).toBe(true);
      const disableData = await disableRes.json();
      expect(disableData.showerEnabled).toBe(false);
    });

    test('can regenerate shower code', async ({ authedPage }) => {
      const code1 = await enableShowerMode(authedPage);

      const regenRes = await authedPage.request.put('/api/shower/config', {
        data: { regenerate: true },
      });
      expect(regenRes.ok()).toBe(true);
      const regenData = await regenRes.json();
      expect(regenData.showerCode).toBeTruthy();
      expect(regenData.showerCode).not.toBe(code1);

      await disableShowerMode(authedPage);
    });
  });

  test.describe('Guest Page (Public)', () => {
    test('loads without auth and shows form for valid code', async ({ authedPage, browser }) => {
      const code = await enableShowerMode(authedPage);

      // Open in a fresh context (no auth)
      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();

      await guestPage.goto(`/shower/${code}`);
      await expect(guestPage.locator('#guestName')).toBeVisible({ timeout: 10000 });
      await expect(guestPage.locator('#message')).toBeVisible();

      await guestContext.close();
      await disableShowerMode(authedPage);
    });

    test('shows unavailable for invalid code', async ({ browser }) => {
      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();

      await guestPage.goto('/shower/invalidcode123');
      await expect(guestPage.locator('text=Unavailable')).toBeVisible({ timeout: 10000 });

      await guestContext.close();
    });

    test('guest submits message and sees thank you', async ({ authedPage, browser }) => {
      const code = await enableShowerMode(authedPage);

      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();

      await guestPage.goto(`/shower/${code}`);
      await guestPage.locator('#guestName').waitFor({ state: 'visible', timeout: 10000 });

      await guestPage.fill('#guestName', 'Aunt Sally');
      await guestPage.fill('#message', 'Wishing you all the best!');
      await guestPage.click('button[type="submit"]');

      await expect(guestPage.locator('text=Thank You')).toBeVisible({ timeout: 10000 });

      await guestContext.close();
      await disableShowerMode(authedPage);
    });
  });

  test.describe('Message Submission API', () => {
    test('disabled code rejects submissions with 403', async ({ authedPage, browser }) => {
      const code = await enableShowerMode(authedPage);
      await disableShowerMode(authedPage);

      // Submit from unauthenticated context
      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();
      await guestPage.goto('/login'); // need to load a page first for request context

      const res = await guestPage.request.post('/api/shower/messages', {
        data: { guestName: 'Test', message: 'Hello', showerCode: code },
      });
      expect(res.status()).toBe(403);

      await guestContext.close();
    });

    test('XSS payloads are sanitized in stored messages', async ({ authedPage }) => {
      const code = await enableShowerMode(authedPage);

      for (const payload of XSS_PAYLOADS.slice(0, 3)) {
        const msgId = await submitGuestMessage(authedPage, code, payload, payload);
        expect(msgId).toBeTruthy();
      }

      // Fetch messages and verify no raw HTML tags remain
      const res = await authedPage.request.get('/api/shower/messages');
      const messages = await res.json();

      for (const msg of messages) {
        expect(msg.guestName).not.toContain('<script');
        expect(msg.guestName).not.toContain('onerror=');
        expect(msg.message).not.toContain('<script');
        expect(msg.message).not.toContain('onerror=');
      }

      await disableShowerMode(authedPage);
    });

    test('SQL injection payloads do not break API', async ({ authedPage }) => {
      const code = await enableShowerMode(authedPage);

      for (const payload of SQLI_PAYLOADS) {
        const msgId = await submitGuestMessage(authedPage, code, payload, payload);
        expect(msgId).toBeTruthy();
      }

      // Verify API still works
      const res = await authedPage.request.get('/api/shower/messages');
      expect(res.ok()).toBe(true);

      await disableShowerMode(authedPage);
    });
  });

  test.describe('Admin Guestbook Page', () => {
    test('admin can view guestbook page', async ({ authedPage }) => {
      await authedPage.goto('/guestbook');
      await expect(authedPage.locator('text=Guestbook')).toBeVisible({ timeout: 10000 });
    });

    test('admin can delete messages', async ({ authedPage }) => {
      const code = await enableShowerMode(authedPage);
      const msgId = await submitGuestMessage(authedPage, code, 'Delete Me', 'This will be deleted');
      expect(msgId).toBeTruthy();

      const deleteRes = await authedPage.request.delete(`/api/shower/messages/${msgId}`);
      expect(deleteRes.ok()).toBe(true);

      await disableShowerMode(authedPage);
    });

    test('admin can promote message to entry', async ({ authedPage }) => {
      const code = await enableShowerMode(authedPage);
      const msgId = await submitGuestMessage(authedPage, code, 'Promote Me', 'Great wishes!');
      expect(msgId).toBeTruthy();

      const promoteRes = await authedPage.request.post(`/api/shower/messages/${msgId}`);
      expect(promoteRes.ok()).toBe(true);
      const promoteData = await promoteRes.json();
      expect(promoteData.entryId).toBeTruthy();

      await disableShowerMode(authedPage);
    });

    test('double-promote returns 409', async ({ authedPage }) => {
      const code = await enableShowerMode(authedPage);
      const msgId = await submitGuestMessage(authedPage, code, 'Once Only', 'Promote once');
      expect(msgId).toBeTruthy();

      const first = await authedPage.request.post(`/api/shower/messages/${msgId}`);
      expect(first.ok()).toBe(true);

      const second = await authedPage.request.post(`/api/shower/messages/${msgId}`);
      expect(second.status()).toBe(409);

      await disableShowerMode(authedPage);
    });
  });

  test.describe('Sidebar', () => {
    test('guestbook link visible for admin', async ({ authedPage }) => {
      await authedPage.goto('/dashboard');
      await expect(authedPage.locator('nav >> text=Guestbook')).toBeVisible({ timeout: 10000 });
    });
  });
});
