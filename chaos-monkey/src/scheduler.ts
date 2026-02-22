import chalk from 'chalk';
import { Injector, ApiClient } from './types';
import { Reporter } from './reporter';

export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;
  private _isPaused = false;
  private intervalMs: number;
  private probability: number;

  constructor(intervalMs: number, probability: number) {
    this.intervalMs = intervalMs;
    this.probability = probability;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  start(injectors: Injector[], client: ApiClient, reporter: Reporter): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this._isPaused = false;

    console.log(chalk.yellow(`Scheduler started: interval=${this.intervalMs}ms, probability=${this.probability}`));

    this.interval = setInterval(async () => {
      if (this._isPaused) return;

      const roll = Math.random();
      if (roll >= this.probability) {
        console.log(chalk.gray(`Skipped tick (roll=${roll.toFixed(2)} >= probability=${this.probability})`));
        return;
      }

      const injector = injectors[Math.floor(Math.random() * injectors.length)];
      console.log(chalk.cyan(`Running injector: ${injector.name}`));

      try {
        const result = await injector.run(client);
        reporter.addResult(result);

        if (result.passed) {
          console.log(
            chalk.green(`  PASS [${injector.name}] ${result.duration}ms${result.details ? ' - ' + result.details : ''}`)
          );
        } else {
          console.log(
            chalk.red(`  FAIL [${injector.name}] ${result.duration}ms - ${result.error || 'unknown error'}`)
          );
        }
      } catch (err: any) {
        const result = {
          injector: injector.name,
          timestamp: new Date(),
          passed: false,
          duration: 0,
          error: `Unhandled: ${err.message}`,
        };
        reporter.addResult(result);
        console.log(chalk.red(`  CRASH [${injector.name}] ${err.message}`));
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this._isRunning = false;
    this._isPaused = false;
    console.log(chalk.yellow('Scheduler stopped'));
  }

  pause(): void {
    this._isPaused = true;
    console.log(chalk.yellow('Scheduler paused'));
  }

  resume(): void {
    this._isPaused = false;
    console.log(chalk.yellow('Scheduler resumed'));
  }
}
