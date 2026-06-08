import { expect, test } from '@playwright/test';
import { getForgotPasswordCredential, DEFAULT_EMAIL_SENDER } from './credentials';
import { getOtpFromGmail } from '../utils/auth-gmail';
import { fillOtpInputs, waitForAndClick } from './otp-utils';
import { START_URL, is502Page, resetToStart } from './flow-utils';


test.setTimeout(90000);

test('Forgot Password flow', async ({ page }) => {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await page.context().clearCookies();

      await page.goto(START_URL, {
        waitUntil: 'load',
        timeout: 120000,
      });
      await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});

      // detect early 502
      if (await is502Page(page)) throw new Error('Detected 502 Bad Gateway');

      // Forgot password
      const forgotLink = page.locator('#home_forgot_Password');
      await forgotLink.waitFor({ state: 'visible', timeout: 15000 });
      await forgotLink.click({ force: true });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for the forgot-password form to actually load.
      const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]');
      await fpUsername.first().waitFor({ state: 'visible', timeout: 30000 });

      // Username
      const forgotCredentials = getForgotPasswordCredential();
      await fpUsername.first().fill(forgotCredentials.username);

      // Next
      await page.locator('#next').click();
      await page.waitForLoadState('load');
      await page.waitForLoadState('networkidle');

      // Some sessions return an interstitial page before the OTP methods appear.
      const gotItBtn = page.locator('text=Got it');
      try {
        await gotItBtn.waitFor({ state: 'visible', timeout: 10000 });
        await gotItBtn.click({ force: true });
        console.log('Dismissed active-session warning');
      } catch {
        console.log('No active-session warning found');
      }

      // Wait for the OTP/verification screen to become available.
      await page.waitForLoadState('load');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await page.waitForTimeout(1500);

      if (await is502Page(page)) throw new Error('Detected 502 Bad Gateway');

      const lockoutMsg = page.locator('text=/temporarily locked out/i');
      if (await lockoutMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
        test.skip(true, 'The test account is temporarily locked out on this environment.');
        return;
      }

      const emailSelected = await waitForAndClick(page, '#email', 'Email OTP option', 15000);
      if (!emailSelected) {
        throw new Error('Email OTP option not available in forgot-password flow.');
      }

      const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
      if (!otp) {
        throw new Error('OTP not found in Gmail for forgot-password flow');
      }

      console.log('OTP received from email:', otp);
      await fillOtpInputs(page, otp);

      // Completed successfully
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