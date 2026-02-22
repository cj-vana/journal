import { chromium, Browser, BrowserContext, Page } from 'playwright';
import chalk from 'chalk';

export class BrowserPool {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async launch(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    console.log(chalk.green('Playwright browser launched'));
  }

  async newPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser not launched');
    // Create fresh context for isolation (fresh cookies/storage each time)
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });
    return this.context.newPage();
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    console.log(chalk.yellow('Playwright browser closed'));
  }
}
