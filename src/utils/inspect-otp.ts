import { chromium } from '@playwright/test';
import { getLoginCredentials } from './credentials';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const creds = getLoginCredentials();
  await page.goto('https://uatisvaext.combank.net/mga/sps/oauth/oauth20/authorize?response_type=code&client_id=iCashProGUISSO&redirect_uri=https%3A%2F%2Ftest.com%2Fcallback&scope=openid&state=76677667', { waitUntil: 'networkidle' });
  await page.fill('#username', creds.username);
  await page.fill('input[type="password"]', creds.password);
  await page.click('#loginBtn');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const gotIt = page.locator('text=/Got it/i').first();
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click({ force: true });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  // Inspect OTP flow elements for debugging removed in cleanup
  await page.click('#email', { force: true });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const visibleInputs = await page.locator('input:visible').all();
  for (let i = 0; i < visibleInputs.length; i++) {
    const input = visibleInputs[i];
    // no-op: retained structure for potential future inspection
    await input.getAttribute('id');
    await input.getAttribute('name');
  }
  await browser.close();
})();
