import chalk from 'chalk';
import { Injector, ApiClient } from './types';
import { Reporter } from './reporter';

export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;
  private _isPaused = false;
  private running = false;
  private consecutiveFailures = 0;
  private circuitBreakerCooldown = false;
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
      if (this.running) return;
      if (this.circuitBreakerCooldown) return;

      this.running = true;
      try {
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
            this.consecutiveFailures = 0;
            console.log(
              chalk.green(`  PASS [${injector.name}] ${result.duration}ms${result.details ? ' - ' + result.details : ''}`)
            );
          } else {
            this.consecutiveFailures++;
            console.log(
              chalk.red(`  FAIL [${injector.name}] ${result.duration}ms - ${result.error || 'unknown error'}`)
            );
            if (this.consecutiveFailures >= 5) {
              this.circuitBreakerCooldown = true;
              console.log(chalk.yellow.bold(`Circuit breaker tripped after ${this.consecutiveFailures} consecutive failures. Pausing for 60s.`));
              setTimeout(() => {
                this.circuitBreakerCooldown = false;
                this.consecutiveFailures = 0;
                console.log(chalk.yellow('Circuit breaker reset. Resuming experiments.'));
              }, 60000);
            }
          }
        } catch (err: any) {
          this.consecutiveFailures++;
          const result = {
            injector: injector.name,
            timestamp: new Date(),
            passed: false,
            duration: 0,
            error: `Unhandled: ${err.message}`,
          };
          reporter.addResult(result);
          console.log(chalk.red(`  CRASH [${injector.name}] ${err.message}`));
          if (this.consecutiveFailures >= 5) {
            this.circuitBreakerCooldown = true;
            console.log(chalk.yellow.bold(`Circuit breaker tripped after ${this.consecutiveFailures} consecutive failures. Pausing for 60s.`));
            setTimeout(() => {
              this.circuitBreakerCooldown = false;
              this.consecutiveFailures = 0;
              console.log(chalk.yellow('Circuit breaker reset. Resuming experiments.'));
            }, 60000);
          }
        }
      } finally {
        this.running = false;
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
