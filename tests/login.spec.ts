import { test } from '@playwright/test';
import { getOtpFromGmail } from '../utils/auth-gmail';
import { getLoginCredentials, DEFAULT_EMAIL_SENDER } from './credentials';
import { fillOtpInputs, waitForAndClick } from './otp-utils';
import { START_URL, is502Page, resetToStart } from './flow-utils';


test.setTimeout(90000);

test.use({
  headless: false,
});

test('ComBank login', async ({ page }) => {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await page.context().clearCookies();
      await page.goto(START_URL, { waitUntil: 'load', timeout: 120000 });
      await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});

      if (await is502Page(page)) throw new Error('Detected 502 Bad Gateway');

      // Login
      const loginCredentials = getLoginCredentials();
      await page.locator('#username').fill(loginCredentials.username);
      await page.locator('input[type="password"]').fill(loginCredentials.password);
      await page.locator('#loginBtn').click();
      await page.waitForLoadState('load');
      await page.waitForLoadState('networkidle');

      // Handle the active-session warning if it appears after login.
      const gotItBtn = page.locator('text=/Got it/i').first();
      try {
        await gotItBtn.waitFor({ state: 'visible', timeout: 15000 });
        await gotItBtn.click({ force: true });
        console.log('Dismissed active-session warning');
      } catch {
        console.log('No active-session warning found');
      }

      // Wait for the OTP screen to be available.
      await page.waitForLoadState('load');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await waitForAndClick(page, '#email', 'Email OTP option', 8000);
      await page.waitForTimeout(2500);
      await waitForAndClick(page, 'button#alt_btn', 'Log in another way option', 8000);
      await waitForAndClick(page, 'button#sms', 'Mobile OTP option', 8000);
      await page.waitForTimeout(3000);
      await waitForAndClick(page, 'button#resendButton', 'Resend OTP button', 8000);
      await waitForAndClick(page, 'button#alt_btn', 'Log in another way option again', 8000);
      await waitForAndClick(page, 'button#sms', 'Mobile OTP option again', 8000);
      await page.waitForTimeout(3000);
      await waitForAndClick(page, 'button#resendButton', 'Resend OTP button again', 8000);

      const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
      if (!otp) {
        throw new Error('OTP not found in Gmail');
      }
      console.log('OTP received from email:', otp);
      await fillOtpInputs(page, otp);
      await page.waitForTimeout(2000);

      // success
      return;
    } catch (err) {
      const found502 = await is502Page(page).catch(() => false);
      const msg = String(err || '');
      const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
      if ((found502 || closedError) && attempt < MAX_ATTEMPTS) {
        console.log(`Detected 502/closed browser — restarting flow (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
        await resetToStart(page);
        continue;
      }
      throw err;
    }
  }
});

