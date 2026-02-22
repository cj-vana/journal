import { Injector, ExperimentResult } from '../types';

const authChaos: Injector = {
  name: 'auth-chaos',
  description: 'Test that protected endpoints reject unauthenticated requests',
  async run(): Promise<ExperimentResult> {
    const start = Date.now();
    const errors: string[] = [];
    // We bypass the ApiClient here to make raw requests without the debug key
    const baseUrl = process.env.TARGET_URL || 'http://localhost:3000';

    try {
      // 1. GET /api/entries with no auth
      const res1 = await fetch(`${baseUrl}/api/entries`, {
        method: 'GET',
        redirect: 'manual',
      });
      if (res1.status !== 401 && res1.status !== 302 && res1.status !== 307) {
        errors.push(`GET /api/entries no auth: got ${res1.status}, expected 401 or redirect`);
      }

      // 2. GET /api/entries with invalid X-Debug-Key
      const res2 = await fetch(`${baseUrl}/api/entries`, {
        method: 'GET',
        headers: { 'X-Debug-Key': 'invalid-key-12345' },
        redirect: 'manual',
      });
      if (res2.status !== 401 && res2.status !== 302 && res2.status !== 307) {
        errors.push(`GET /api/entries bad key: got ${res2.status}, expected 401 or redirect`);
      }

      // 3. POST /api/entries with no auth
      const res3 = await fetch(`${baseUrl}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Unauthorized', content: '{}', entryDate: new Date().toISOString() }),
        redirect: 'manual',
      });
      if (res3.status !== 401 && res3.status !== 302 && res3.status !== 307) {
        errors.push(`POST /api/entries no auth: got ${res3.status}, expected 401 or redirect`);
      }

      const passed = errors.length === 0;
      return {
        injector: 'auth-chaos',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details: passed ? 'All auth checks passed' : undefined,
        error: passed ? undefined : errors.join('; '),
      };
    } catch (err: any) {
      return {
        injector: 'auth-chaos',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default authChaos;
