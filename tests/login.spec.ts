import { test } from '@playwright/test';
import { getOtpFromGmail } from '../utils/auth-gmail';
import { getLoginCredentials, DEFAULT_EMAIL_SENDER } from './credentials';
import { fillOtpInputs, waitForAndClick, waitForOtpInputs } from './otp-utils';
import { START_URL, gotoWith502Check, is502Page, resetToStart } from './flow-utils';


test.setTimeout(90000);

test.use({
  headless: false,
});

test('ComBank login', async ({ page }) => {
  const MAX_ATTEMPTS = 3;
  let currentPage = page;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      currentPage = await resetToStart(currentPage);
      const pageToUse = currentPage;

      // Login
      const loginCredentials = getLoginCredentials();
      await pageToUse.locator('#username').fill(loginCredentials.username);
      await pageToUse.locator('input[type="password"]').fill(loginCredentials.password);
      await pageToUse.locator('#loginBtn').click();
      await pageToUse.waitForLoadState('load');
      await pageToUse.waitForLoadState('networkidle');

      // Handle the active-session warning if it appears after login.
      const gotItBtn = pageToUse.locator('text=/Got it/i').first();
      try {
        await gotItBtn.waitFor({ state: 'visible', timeout: 15000 });
        await gotItBtn.click({ force: true });
        console.log('Dismissed active-session warning');
      } catch {
        console.log('No active-session warning found');
      }

      // Wait for the OTP screen to be available.
      await pageToUse.waitForLoadState('load');
      await pageToUse.waitForLoadState('networkidle');
      await pageToUse.waitForTimeout(2000);

      const emailSelected = await waitForAndClick(pageToUse, 'text=/Request OTP to email/i', 'Email OTP option', 45000);
      if (!emailSelected) {
        await waitForAndClick(pageToUse, 'text=/Request OTP to mobile/i', 'Mobile OTP option', 45000);
      }

      await pageToUse.waitForTimeout(2000);
      await waitForOtpInputs(pageToUse, 90000);

      const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
      if (!otp) {
        throw new Error('OTP not found in Gmail');
      }
      console.log('OTP received from email:', otp);
      await fillOtpInputs(pageToUse, otp);
      await pageToUse.waitForTimeout(2000);

      if (await is502Page(pageToUse)) {
        throw new Error('Detected 502 Bad Gateway after OTP entry');
      }

      // success
      return;
    } catch (err) {
      const found502 = await is502Page(currentPage).catch(() => false);
      const msg = String(err || '');
      const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
      if ((found502 || closedError) && attempt < MAX_ATTEMPTS) {
        console.log(`Detected 502/closed browser — restarting flow (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
        currentPage = await resetToStart(currentPage);
        continue;
      }
      throw err;
    }
  }
});

