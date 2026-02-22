import { ExperimentResult } from './types';

const MAX_RESULTS = 1000;

export class Reporter {
  private results: ExperimentResult[] = [];

  addResult(result: ExperimentResult): void {
    this.results.push(result);
    if (this.results.length > MAX_RESULTS) {
      this.results = this.results.slice(this.results.length - MAX_RESULTS);
    }
  }

  getStats(): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    failuresByInjector: Record<string, number>;
  } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = total === 0 ? 0 : passed / total;

    const failuresByInjector: Record<string, number> = {};
    for (const r of this.results) {
      if (!r.passed) {
        failuresByInjector[r.injector] = (failuresByInjector[r.injector] || 0) + 1;
      }
    }

    return { total, passed, failed, passRate, failuresByInjector };
  }

  getHistory(limit?: number): ExperimentResult[] {
    if (limit === undefined) {
      return [...this.results];
    }
    return this.results.slice(-limit);
  }

  exportJson(): string {
    return JSON.stringify(
      {
        stats: this.getStats(),
        results: this.results,
      },
      null,
      2
    );
  }
}
