import chalk from 'chalk';
import { BrowserPool } from './ui-chaos/browser-pool';
import { Reporter } from './reporter';
import { createDashboard } from './dashboard';
import { Scheduler } from './scheduler';
import allUiInjectors from './ui-chaos/injectors';
import { UiChaosInjector } from './ui-chaos/types';
import { Injector, ApiClient, ExperimentResult } from './types';

/**
 * Standalone UI Chaos Runner
 *
 * Launches a Playwright browser and runs Netflix-style chaos experiments
 * against the UI. Clicks everything, fuzzes forms, corrupts state,
 * tests responsive, simulates network failures, and more.
 *
 * Usage:
 *   TARGET_URL=http://localhost:3000 \
 *   CHAOS_EMAIL=admin@example.com \
 *   CHAOS_PASSWORD=password123 \
 *   ts-node src/ui-chaos-runner.ts
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTarget(url: string, maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/login`);
      if (res.status === 200) return true;
    } catch {
      // not ready
    }
    console.log(chalk.gray('Waiting for target app...'));
    await sleep(5000);
  }
  return false;
}

/** Adapt UI injectors to the existing Injector interface for the scheduler */
function adaptUiInjector(
  uiInjector: UiChaosInjector,
  pool: BrowserPool,
  baseUrl: string,
  credentials: { email: string; password: string }
): Injector {
  return {
    name: uiInjector.name,
    description: uiInjector.description,
    async run(_client: ApiClient): Promise<ExperimentResult> {
      const page = await pool.newPage();
      try {
        const result = await uiInjector.run(page, baseUrl, credentials);
        return {
          injector: result.injector,
          timestamp: result.timestamp,
          passed: result.passed,
          duration: result.duration,
          error: result.error,
          details: result.details,
        };
      } finally {
        await page.close().catch(() => {});
      }
    },
  };
}

async function main(): Promise<void> {
  console.log(chalk.red.bold(`
   _   _ ___    ____ _                       __  __             _
  | | | |_ _|  / ___| |__   __ _  ___  ___  |  \\/  | ___  _ __ | | _____ _   _
  | | | || |  | |   | '_ \\ / _\` |/ _ \\/ __| | |\\/| |/ _ \\| '_ \\| |/ / _ \\ | | |
  | |_| || |  | |___| | | | (_| | (_) \\__ \\ | |  | | (_) | | | |   <  __/ |_| |
   \\___/|___|  \\____|_| |_|\\__,_|\\___/|___/ |_|  |_|\\___/|_| |_|_|\\_\\___|\\__, |
                                                                           __/ |
   Playwright + Netflix-style UI Chaos Testing                            |___/
  `));

  const baseUrl = (process.env.TARGET_URL || 'http://localhost:3000').replace(/\/$/, '');
  const email = process.env.CHAOS_EMAIL || 'admin@example.com';
  const password = process.env.CHAOS_PASSWORD || 'password123';
  const intervalMs = parseInt(process.env.CHAOS_INTERVAL_MS || '60000', 10);
  const probability = parseFloat(process.env.CHAOS_PROBABILITY || '0.8');
  const enabledInjectors = process.env.ENABLED_UI_INJECTORS
    ? process.env.ENABLED_UI_INJECTORS.split(',').map((s) => s.trim())
    : [];

  console.log(chalk.cyan('Config:'));
  console.log(chalk.gray(`  Target: ${baseUrl}`));
  console.log(chalk.gray(`  Credentials: ${email}`));
  console.log(chalk.gray(`  Interval: ${intervalMs}ms`));
  console.log(chalk.gray(`  Probability: ${probability}`));

  // Wait for target
  console.log(chalk.yellow('Waiting for target app...'));
  const healthy = await waitForTarget(baseUrl, 60000);
  if (!healthy) {
    console.log(chalk.red('Target did not become healthy. Exiting.'));
    process.exit(1);
  }
  console.log(chalk.green('Target is healthy!'));

  // Launch browser
  const pool = new BrowserPool();
  await pool.launch();

  const reporter = new Reporter();
  const credentials = { email, password };

  // Filter injectors
  let uiInjectors = allUiInjectors;
  if (enabledInjectors.length > 0) {
    uiInjectors = allUiInjectors.filter((inj) => enabledInjectors.includes(inj.name));
  }

  console.log(chalk.cyan(`Enabled UI chaos injectors (${uiInjectors.length}):`));
  for (const inj of uiInjectors) {
    console.log(chalk.gray(`  [${inj.category}] ${inj.name}: ${inj.description}`));
  }

  if (uiInjectors.length === 0) {
    console.log(chalk.red('No UI injectors enabled. Exiting.'));
    process.exit(1);
  }

  // Adapt to existing scheduler interface
  const dummyClient: ApiClient = {
    get: async () => ({ status: 0, data: null }),
    post: async () => ({ status: 0, data: null }),
    put: async () => ({ status: 0, data: null }),
    delete: async () => ({ status: 0, data: null }),
    upload: async () => ({ status: 0, data: null }),
  };

  const injectors = uiInjectors.map((inj) =>
    adaptUiInjector(inj, pool, baseUrl, credentials)
  );

  // Run one-shot mode or continuous mode
  const oneShot = process.env.CHAOS_MODE === 'oneshot';

  if (oneShot) {
    console.log(chalk.yellow('\nRunning ALL UI chaos injectors once...\n'));
    for (const inj of injectors) {
      console.log(chalk.cyan(`Running: ${inj.name}...`));
      const result = await inj.run(dummyClient);
      reporter.addResult(result);

      if (result.passed) {
        console.log(chalk.green(`  PASS [${inj.name}] ${result.duration}ms${result.details ? ' - ' + result.details : ''}`));
      } else {
        console.log(chalk.red(`  FAIL [${inj.name}] ${result.duration}ms - ${result.error || 'unknown'}`));
        if (result.details) console.log(chalk.gray(`    Details: ${result.details}`));
      }
    }

    const stats = reporter.getStats();
    console.log(chalk.cyan('\n=== Final Results ==='));
    console.log(chalk.gray(`  Total: ${stats.total}`));
    console.log(chalk.green(`  Passed: ${stats.passed}`));
    console.log(chalk.red(`  Failed: ${stats.failed}`));
    console.log(chalk.cyan(`  Pass Rate: ${(stats.passRate * 100).toFixed(1)}%`));

    if (Object.keys(stats.failuresByInjector).length > 0) {
      console.log(chalk.red('\n  Failures:'));
      for (const [name, count] of Object.entries(stats.failuresByInjector)) {
        console.log(chalk.red(`    ${name}: ${count}`));
      }
    }

    await pool.close();
    process.exit(stats.failed > 0 ? 1 : 0);
  }

  // Continuous mode with scheduler
  const scheduler = new Scheduler(intervalMs, probability);
  scheduler.start(injectors, dummyClient, reporter);

  const dashboardApp = createDashboard(reporter, scheduler);
  const dashboardPort = parseInt(process.env.DASHBOARD_PORT || '3002', 10);
  const server = dashboardApp.listen(dashboardPort, () => {
    console.log(chalk.green(`UI Chaos Dashboard at http://localhost:${dashboardPort}`));
  });

  const shutdown = async () => {
    console.log(chalk.yellow('\nShutting down...'));
    scheduler.stop();

    const stats = reporter.getStats();
    console.log(chalk.cyan('\nFinal Stats:'));
    console.log(chalk.gray(`  Total: ${stats.total}`));
    console.log(chalk.green(`  Passed: ${stats.passed}`));
    console.log(chalk.red(`  Failed: ${stats.failed}`));
    console.log(chalk.cyan(`  Pass Rate: ${(stats.passRate * 100).toFixed(1)}%`));

    await pool.close();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
