import { Page, expect } from '@playwright/test';

export const ROUTES = {
  dashboard: '/dashboard',
  entries: '/entries',
  newEntry: '/entries/new',
  milestones: '/milestones',
  growth: '/growth',
  settings: '/settings',
  settingsUsers: '/settings/users',
  export: '/export',
  guestbook: '/guestbook',
  login: '/login',
  register: '/register',
  setup: '/setup',
} as const;

export const ALL_APP_ROUTES = [
  ROUTES.dashboard,
  ROUTES.entries,
  ROUTES.newEntry,
  ROUTES.milestones,
  ROUTES.growth,
  ROUTES.settings,
  ROUTES.guestbook,
  ROUTES.export,
];

export const TIPTAP_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Test content from chaos monkey' }],
    },
  ],
};

export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  '"><script>alert(document.cookie)</script>',
  "javascript:alert('xss')",
  '<svg onload=alert(1)>',
  '<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:red;z-index:9999">HACKED</div>',
  '{{constructor.constructor("return this")().alert(1)}}',
  '<iframe src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '<input onfocus=alert(1) autofocus>',
];

export const SQLI_PAYLOADS = [
  "'; DROP TABLE entries; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "1; DELETE FROM entries WHERE 1=1",
  "admin'--",
];

export const BOUNDARY_STRINGS = [
  '',
  ' ',
  '\t\n\r',
  '\0\0\0',
  'a'.repeat(100000),
  '../../etc/passwd',
  '%00%00%00',
  String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)),
  '\uD800\uDBFF', // invalid surrogate pair
  '\uFEFF\u200B\u200C\u200D', // zero-width chars
  '🎉🔥💀👻🤖'.repeat(1000),
];

export const EDGE_CASE_NUMBERS = [
  '-999999', '0', '99999999', '0.0001', '-0', 'NaN', 'Infinity',
  '-Infinity', '1e308', '1e-308', '2.2250738585072014e-308',
];

export function randomString(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function ensureNoConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

export async function createEntryViaAPI(page: Page, title: string): Promise<string | null> {
  const response = await page.request.post('/api/entries', {
    data: {
      title,
      content: JSON.stringify(TIPTAP_DOC),
      entryDate: new Date().toISOString(),
    },
  });
  if (response.ok()) {
    const data = await response.json();
    return data.id || null;
  }
  return null;
}

export async function deleteEntryViaAPI(page: Page, id: string): Promise<void> {
  await page.request.delete(`/api/entries/${id}`).catch(() => {});
}

export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
}

export async function enableShowerMode(page: Page): Promise<string> {
  // Enable shower mode and return the code
  const res = await page.request.put('/api/shower/config', {
    data: { enabled: true },
  });
  const data = await res.json();
  return data.showerCode;
}

export async function disableShowerMode(page: Page): Promise<void> {
  await page.request.put('/api/shower/config', {
    data: { enabled: false },
  });
}

export async function submitGuestMessage(
  page: Page,
  code: string,
  guestName: string,
  message: string
): Promise<string | null> {
  const res = await page.request.post('/api/shower/messages', {
    data: { guestName, message, showerCode: code },
  });
  if (res.ok()) {
    const data = await res.json();
    return data.id || null;
  }
  return null;
}

// 1x1 white PNG as base64
export const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

export function validPngBuffer(): Buffer {
  return Buffer.from(VALID_PNG_BASE64, 'base64');
}
