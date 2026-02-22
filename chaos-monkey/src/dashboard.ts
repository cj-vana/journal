import express from 'express';
import { Reporter } from './reporter';
import { Scheduler } from './scheduler';

export function createDashboard(reporter: Reporter, scheduler: Scheduler): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/api/stats', (_req, res) => {
    res.json(reporter.getStats());
  });

  app.get('/api/history', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    res.json(reporter.getHistory(limit));
  });

  app.post('/api/pause', (_req, res) => {
    if (scheduler.isPaused) {
      scheduler.resume();
      res.json({ status: 'resumed' });
    } else {
      scheduler.pause();
      res.json({ status: 'paused' });
    }
  });

  app.get('/', (_req, res) => {
    const stats = reporter.getStats();
    const history = reporter.getHistory(50);
    const status = !scheduler.isRunning ? 'stopped' : scheduler.isPaused ? 'paused' : 'running';

    const injectorMap: Record<string, { runs: number; passed: number }> = {};
    for (const r of reporter.getHistory()) {
      if (!injectorMap[r.injector]) {
        injectorMap[r.injector] = { runs: 0, passed: 0 };
      }
      injectorMap[r.injector].runs++;
      if (r.passed) injectorMap[r.injector].passed++;
    }

    const injectorRows = Object.entries(injectorMap)
      .map(
        ([name, data]) =>
          `<tr><td>${esc(name)}</td><td>${data.runs}</td><td>${((data.passed / data.runs) * 100).toFixed(1)}%</td></tr>`
      )
      .join('');

    const historyRows = history
      .reverse()
      .map(
        (r) =>
          `<tr class="${r.passed ? 'pass' : 'fail'}">` +
          `<td>${new Date(r.timestamp).toLocaleString()}</td>` +
          `<td>${esc(r.injector)}</td>` +
          `<td>${r.passed ? 'PASS' : 'FAIL'}</td>` +
          `<td>${r.duration}ms</td>` +
          `<td>${esc(r.error || '')}</td>` +
          `</tr>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Chaos Monkey Dashboard</title>
<meta http-equiv="refresh" content="10">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #eee; font-family: 'Courier New', monospace; padding: 20px; }
  h1 { color: #e94560; margin-bottom: 20px; }
  h2 { color: #e94560; margin: 20px 0 10px; }
  .status { font-size: 1.2em; margin-bottom: 20px; }
  .status .running { color: #4ecca3; }
  .status .paused { color: #f0a500; }
  .status .stopped { color: #e94560; }
  .stats { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat-card { background: #16213e; border: 1px solid #e94560; border-radius: 8px; padding: 15px 20px; min-width: 120px; }
  .stat-card .label { color: #aaa; font-size: 0.85em; }
  .stat-card .value { font-size: 1.5em; font-weight: bold; color: #e94560; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #333; }
  th { background: #16213e; color: #e94560; }
  tr.pass td:nth-child(3) { color: #4ecca3; }
  tr.fail td:nth-child(3) { color: #e94560; }
  .controls { margin-bottom: 20px; }
  button { background: #e94560; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 1em; }
  button:hover { background: #c73e54; }
</style>
</head>
<body>
  <h1>Chaos Monkey Dashboard</h1>
  <div class="status">Status: <span class="${status}">${status.toUpperCase()}</span></div>
  <div class="controls">
    <form method="POST" action="/api/pause" style="display:inline">
      <button type="submit">${scheduler.isPaused ? 'Resume' : 'Pause'}</button>
    </form>
  </div>
  <div class="stats">
    <div class="stat-card"><div class="label">Total</div><div class="value">${stats.total}</div></div>
    <div class="stat-card"><div class="label">Passed</div><div class="value">${stats.passed}</div></div>
    <div class="stat-card"><div class="label">Failed</div><div class="value">${stats.failed}</div></div>
    <div class="stat-card"><div class="label">Pass Rate</div><div class="value">${(stats.passRate * 100).toFixed(1)}%</div></div>
  </div>
  <h2>Injector Breakdown</h2>
  <table>
    <thead><tr><th>Injector</th><th>Runs</th><th>Pass Rate</th></tr></thead>
    <tbody>${injectorRows || '<tr><td colspan="3">No data yet</td></tr>'}</tbody>
  </table>
  <h2>Recent Experiments (last 50)</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Injector</th><th>Result</th><th>Duration</th><th>Error</th></tr></thead>
    <tbody>${historyRows || '<tr><td colspan="5">No experiments yet</td></tr>'}</tbody>
  </table>
</body>
</html>`);
  });

  return app;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
