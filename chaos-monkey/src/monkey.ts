import chalk from 'chalk';
import { loadConfig } from './config';
import { HttpApiClient } from './api-client';
import { Reporter } from './reporter';
import { Scheduler } from './scheduler';
import { createDashboard } from './dashboard';
import allInjectors from './injectors';

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

async function main(): Promise<void> {
  console.log(chalk.red.bold(`
   _____ _                       __  __             _
  / ____| |                     |  \\/  |           | |
 | |    | |__   __ _  ___  ___  | \\  / | ___  _ __ | | _____ _   _
 | |    | '_ \\ / _\` |/ _ \\/ __| | |\\/| |/ _ \\| '_ \\| |/ / _ \\ | | |
 | |____| | | | (_| | (_) \\__ \\ | |  | | (_) | | | |   <  __/ |_| |
  \\_____|_| |_|\\__,_|\\___/|___/ |_|  |_|\\___/|_| |_|_|\\_\\___|\\__, |
                                                                __/ |
                                                               |___/
  `));

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

  // Filter injectors based on config
  let injectors = allInjectors;
  if (config.enabledInjectors.length > 0) {
    injectors = allInjectors.filter((inj) => config.enabledInjectors.includes(inj.name));
  }

  console.log(chalk.cyan(`Enabled injectors (${injectors.length}):`));
  for (const inj of injectors) {
    console.log(chalk.gray(`  - ${inj.name}: ${inj.description}`));
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
