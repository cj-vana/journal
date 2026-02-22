import Docker from 'dockerode';
import { Injector, ApiClient, ExperimentResult } from '../types';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const processKiller: Injector = {
  name: 'process-killer',
  description: 'Restart the baby-journal container and verify data persistence',
  async run(client: ApiClient): Promise<ExperimentResult> {
    const start = Date.now();

    try {
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });

      // Test Docker connectivity
      try {
        await docker.ping();
      } catch {
        return {
          injector: 'process-killer',
          timestamp: new Date(),
          passed: true,
          duration: Date.now() - start,
          details: 'Docker socket not available - skipped',
        };
      }

      // Get entry count before restart
      const before = await client.get('/api/entries');
      const beforeCount = Array.isArray(before.data) ? before.data.length : 0;

      // Find and restart the baby-journal container
      const containers = await docker.listContainers({ all: true });
      const target = containers.find(
        (c) =>
          c.Names.some((n) => n.includes('baby-journal')) ||
          c.Names.some((n) => n.includes('journal')) ||
          (c.Image && c.Image.includes('journal'))
      );

      if (!target) {
        return {
          injector: 'process-killer',
          timestamp: new Date(),
          passed: true,
          duration: Date.now() - start,
          details: 'Target container not found - skipped',
        };
      }

      const container = docker.getContainer(target.Id);
      await container.restart();

      // Wait for the app to come back up (poll every 5s for up to 30s)
      let healthy = false;
      for (let i = 0; i < 6; i++) {
        await sleep(5000);
        try {
          const status = await client.get('/api/debug/status');
          if (status.status === 200) {
            healthy = true;
            break;
          }
        } catch {
          // Still coming up
        }
      }

      if (!healthy) {
        return {
          injector: 'process-killer',
          timestamp: new Date(),
          passed: false,
          duration: Date.now() - start,
          error: 'App did not recover within 30 seconds after restart',
        };
      }

      // Verify data persisted
      const after = await client.get('/api/entries');
      const afterCount = Array.isArray(after.data) ? after.data.length : 0;

      const passed = afterCount === beforeCount;
      return {
        injector: 'process-killer',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details: `Container restarted. Entries before=${beforeCount}, after=${afterCount}`,
        error: passed ? undefined : `Data loss: before=${beforeCount}, after=${afterCount}`,
      };
    } catch (err: any) {
      return {
        injector: 'process-killer',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default processKiller;
