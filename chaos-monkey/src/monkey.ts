import chalk from 'chalk';
import { execSync } from 'child_process';
import { loadConfig } from './config';
import { HttpApiClient } from './api-client';
import { Reporter } from './reporter';
import { Scheduler } from './scheduler';
import { createDashboard } from './dashboard';
import allInjectors from './injectors';
import { BrowserPool } from './ui-chaos/browser-pool';
import allUiInjectors from './ui-chaos/injectors';
import { UiChaosInjector } from './ui-chaos/types';
import { Injector, ApiClient, ExperimentResult } from './types';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTarget(client: HttpApiClient, maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await client.get('/api/debug/status');
      if (res.status === 200) {
        return true;
      }
    } catch {
      // Target not ready yet
    }
    console.log(chalk.gray('Waiting for target app to be healthy...'));
    await sleep(5000);
  }
  return false;
}

function runPlaywrightTests(project?: string): void {
  console.log(chalk.cyan('\nRunning Playwright test suite...'));
  const projectArg = project ? `--project=${project}` : '';
  try {
    execSync(`npx playwright test ${projectArg}`, {
      stdio: 'inherit',
      cwd: __dirname + '/..',
      env: {
        ...process.env,
        TARGET_URL: process.env.TARGET_URL || 'http://localhost:3000',
      },
    });
    console.log(chalk.green('Playwright tests completed successfully'));
  } catch {
    console.log(chalk.red('Some Playwright tests failed - check the report'));
  }
}

async function main(): Promise<void> {
  console.log(chalk.red.bold(`
   _____ _                       __  __             _
  / ____| |                     |  \\/  |           | |
 | |    | |__   __ _  ___  ___  | \\  / | ___  _ __ | | _____ _   _
 | |    | '_ \\ / _\` |/ _ \\/ __| | |\\/| |/ _ \\| '_ \\| |/ / _ \\ | | |
 | |____| | | | (_| | (_) \\__ \\ | |  | | (_) | | | |   <  __/ |_| |
  \\_____|_| |_|\\__,_|\\___/|___/ |_|  |_|\\___/|_| |_|_|\\_\\___|\\__, |
                                                                __/ |
   v3.0 - Netflix-style Chaos Engineering + Playwright         |___/
  `));

  // Check if we should run Playwright tests instead of continuous mode
  const mode = process.env.CHAOS_MODE;
  if (mode === 'playwright' || mode === 'test') {
    runPlaywrightTests();
    return;
  }
  if (mode === 'playwright:chaos') {
    runPlaywrightTests('chaos');
    return;
  }
  if (mode === 'playwright:e2e') {
    runPlaywrightTests('e2e');
    return;
  }
  if (mode === 'playwright:a11y') {
    runPlaywrightTests('accessibility');
    return;
  }

  const config = loadConfig();
  console.log(chalk.cyan('Config loaded:'));
  console.log(chalk.gray(`  Target: ${config.targetUrl}`));
  console.log(chalk.gray(`  Interval: ${config.intervalMs}ms`));
  console.log(chalk.gray(`  Probability: ${config.probability}`));

  const client = new HttpApiClient(config.targetUrl, config.debugKey);
  const reporter = new Reporter();

  // Wait for target to be healthy
  console.log(chalk.yellow('Waiting for target app to become healthy...'));
  const healthy = await waitForTarget(client, 60000);
  if (!healthy) {
    console.log(chalk.red('Target app did not become healthy within 60 seconds. Exiting.'));
    process.exit(1);
  }
  console.log(chalk.green('Target app is healthy!'));

  // Filter API injectors based on config
  let injectors = allInjectors;
  if (config.enabledInjectors.length > 0) {
    injectors = allInjectors.filter((inj) => config.enabledInjectors.includes(inj.name));
  }

  console.log(chalk.cyan(`Enabled API injectors (${injectors.length}):`));
  for (const inj of injectors) {
    console.log(chalk.gray(`  - ${inj.name}: ${inj.description}`));
  }

  // Add UI chaos injectors if Playwright mode is enabled
  let pool: BrowserPool | null = null;
  const enableUi = process.env.ENABLE_UI_CHAOS === 'true';
  if (enableUi) {
    const email = process.env.CHAOS_EMAIL || 'admin@example.com';
    const password = process.env.CHAOS_PASSWORD || 'password123';
    const credentials = { email, password };

    pool = new BrowserPool();
    await pool.launch();

    const uiAdapted: Injector[] = allUiInjectors.map((uiInj: UiChaosInjector) => ({
      name: uiInj.name,
      description: uiInj.description,
      async run(_client: ApiClient): Promise<ExperimentResult> {
        const page = await pool!.newPage();
        try {
          const result = await uiInj.run(page, config.targetUrl, credentials);
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
    }));

    injectors = [...injectors, ...uiAdapted];
    console.log(chalk.cyan(`Enabled UI chaos injectors (${uiAdapted.length}):`));
    for (const inj of uiAdapted) {
      console.log(chalk.gray(`  - ${inj.name}: ${inj.description}`));
    }
  }

  if (injectors.length === 0) {
    console.log(chalk.red('No injectors enabled. Exiting.'));
    process.exit(1);
  }

  // Start scheduler
  const scheduler = new Scheduler(config.intervalMs, config.probability);
  scheduler.start(injectors, client, reporter);

  // Start dashboard
  const dashboardApp = createDashboard(reporter, scheduler);
  const dashboardPort = parseInt(process.env.DASHBOARD_PORT || '3001', 10);
  const server = dashboardApp.listen(dashboardPort, () => {
    console.log(chalk.green(`Dashboard running at http://localhost:${dashboardPort}`));
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log(chalk.yellow('\nShutting down...'));
    scheduler.stop();

    const stats = reporter.getStats();
    console.log(chalk.cyan('\nFinal Stats:'));
    console.log(chalk.gray(`  Total experiments: ${stats.total}`));
    console.log(chalk.gray(`  Passed: ${stats.passed}`));
    console.log(chalk.gray(`  Failed: ${stats.failed}`));
    console.log(chalk.gray(`  Pass rate: ${(stats.passRate * 100).toFixed(1)}%`));

    if (Object.keys(stats.failuresByInjector).length > 0) {
      console.log(chalk.red('  Failures by injector:'));
      for (const [name, count] of Object.entries(stats.failuresByInjector)) {
        console.log(chalk.red(`    ${name}: ${count}`));
      }
    }

    if (pool) {
      pool.close().catch(() => {});
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
