import { Injector, ApiClient, ExperimentResult } from '../types';

const networkThrottle: Injector = {
  name: 'network-throttle',
  description: 'Measure latency across 10 sequential requests to detect performance issues',
  async run(client: ApiClient): Promise<ExperimentResult> {
    const start = Date.now();
    const latencies: number[] = [];
    const TIMEOUT = 10000;

    try {
      for (let i = 0; i < 10; i++) {
        const reqStart = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT);

        try {
          await client.get('/api/debug/status');
          const elapsed = Date.now() - reqStart;
          latencies.push(elapsed);
        } catch {
          latencies.push(TIMEOUT);
        } finally {
          clearTimeout(timer);
        }
      }

      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const min = Math.min(...latencies);
      const max = Math.max(...latencies);
      const timedOut = latencies.some((l) => l >= TIMEOUT);

      const passed = avg < 5000 && !timedOut;
      return {
        injector: 'network-throttle',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details: `avg=${avg.toFixed(0)}ms, min=${min}ms, max=${max}ms`,
        error: passed
          ? undefined
          : timedOut
            ? `Request timed out (>${TIMEOUT}ms)`
            : `Average latency too high: ${avg.toFixed(0)}ms`,
      };
    } catch (err: any) {
      return {
        injector: 'network-throttle',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default networkThrottle;
