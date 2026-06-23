import { chromium } from '@playwright/test';
import { saveScreenshot } from './screenshot-utils';

(async () => {
  process.env.BROWSER_NAME = 'Chrome';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://example.com', { waitUntil: 'networkidle' });
  await saveScreenshot(page, 'example-homepage', 'login');
  await browser.close();
})();
