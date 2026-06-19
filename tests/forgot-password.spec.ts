import { expect, test } from '@playwright/test';
import { getForgotPasswordCredential, DEFAULT_EMAIL_SENDER } from '../src/utils/credentials';
import { getOtpFromGmail } from '../src/utils/auth-gmail';
import { fillOtpInputs, selectOtpMethod, waitForAndClick, waitForOtpInputs } from '../src/utils/otp-utils';
import { START_URL, gotoWith502Check, is502Page, resetToStart } from '../src/utils/flow-utils';
import { saveScreenshot } from '../src/utils/screenshot-utils';


test.setTimeout(180000);

test('Forgot Password flow', async ({ page }) => {
  
  const MAX_ATTEMPTS = 3;
  let currentPage = page;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      currentPage = await resetToStart(currentPage);
      const pageToUse = currentPage;

      // detect early 502
      if (await is502Page(pageToUse)) throw new Error('Detected 502 Bad Gateway');

      

      // Forgot password
      const forgotClicked =
        (await waitForAndClick(pageToUse, '#home_forgot_Password', 'Forgot password link', 15000)) ||
        (await waitForAndClick(pageToUse, 'text=/Forgot password/i', 'Forgot password link', 15000));
      if (!forgotClicked) {
        throw new Error('Unable to open forgot password flow');
      }
      await pageToUse.waitForLoadState('domcontentloaded');
      await pageToUse.waitForLoadState('networkidle');
      

      // Wait for the forgot-password form to actually load.
      const fpUsername = pageToUse.locator('#FPUsername, input[name="FPUsername"]');
      await fpUsername.first().waitFor({ state: 'visible', timeout: 30000 });

      // Username
      const forgotCredentials = getForgotPasswordCredential();
      await fpUsername.first().fill(forgotCredentials.username);

      // Next
      await pageToUse.locator('#next').click();
      await pageToUse.waitForLoadState('load');
      await pageToUse.waitForLoadState('networkidle');

      // Some sessions return an interstitial page before the OTP methods appear.
      const gotItBtn = pageToUse.locator('text=Got it');
      try {
        await gotItBtn.waitFor({ state: 'visible', timeout: 10000 });
        await gotItBtn.click({ force: true });
        console.log('Dismissed active-session warning');
      } catch {
        console.log('No active-session warning found');
      }

      // Wait for the OTP/verification screen to become available.
      await pageToUse.waitForLoadState('load');
      await pageToUse.waitForLoadState('networkidle');
      await pageToUse.waitForTimeout(3000);
      await pageToUse.waitForTimeout(1500);

      if (await is502Page(pageToUse)) throw new Error('Detected 502 Bad Gateway');

      const lockoutMsg = pageToUse.locator('text=/temporarily locked out/i');
      if (await lockoutMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
        test.skip(true, 'The test account is temporarily locked out on this environment.');
        return;
      }

      const sessionTimeoutMsg = pageToUse.locator('text=/session.*timeout|Your session has ended|login again to continue/i');
      if (await sessionTimeoutMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
        throw new Error('Session timed out on forgot-password flow before OTP selection.');
      }

      const otpMethodSelected = await selectOtpMethod(pageToUse, 45000);
      if (!otpMethodSelected) {
        throw new Error('OTP option not available in forgot-password flow.');
      }
      await waitForOtpInputs(pageToUse, 90000);

      const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
      if (!otp) {
        throw new Error('OTP not found in Gmail for forgot-password flow');
      }

      console.log('OTP received from email:', otp);
      await fillOtpInputs(pageToUse, otp);

      if (await is502Page(pageToUse)) {
        throw new Error('Detected 502 Bad Gateway after OTP entry');
      }

      await saveScreenshot(pageToUse, 'forgot-password_final-success', 'forgot-password');
      return;
    } catch (err) {
      const found502 = await is502Page(currentPage).catch(() => false);
      const msg = String(err || '');
      const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
      const sessionTimeoutError = /session.*timeout|session has ended|login again/i.test(msg);
      if ((found502 || closedError || sessionTimeoutError) && attempt < MAX_ATTEMPTS) {
        console.log(`Detected 502/closed/browser timeout — restarting flow (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
        currentPage = await resetToStart(currentPage);
        continue;
      }
      throw err;
    }
  }
});
