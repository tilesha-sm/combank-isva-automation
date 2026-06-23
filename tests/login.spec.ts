import { test } from './hooks';
import { getOtpFromGmail, getLoginCredentials, DEFAULT_EMAIL_SENDER, fillOtpInputs, selectOtpMethod, waitForOtpInputs, START_URL, gotoWith502Check, is502Page, resetToStart, saveScreenshot } from '../src/utils';


test.setTimeout(180000);

test.use({
  headless: false,
});

test('ComBank login', async ({ page }) => {
  // No auto screenshots; capture a single final-success screenshot on success.
  
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
      } catch {
        // no interstitial appeared
      }

      // Wait for the OTP screen to be available.
      await pageToUse.waitForLoadState('load');
      await pageToUse.waitForLoadState('networkidle');
      await pageToUse.waitForTimeout(2000);

      const otpMethodSelected = await selectOtpMethod(pageToUse, 45000);
      if (!otpMethodSelected) {
        throw new Error('OTP option not available in login flow.');
      }
      

      await pageToUse.waitForTimeout(2000);
      await waitForOtpInputs(pageToUse, 90000);
      

      const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
      if (!otp) {
        throw new Error('OTP not found in Gmail');
      }
      // OTP received from email
      await fillOtpInputs(pageToUse, otp);
      
      await pageToUse.waitForTimeout(2000);

      if (await is502Page(pageToUse)) {
        throw new Error('Detected 502 Bad Gateway after OTP entry');
      }

      // success — single final screenshot
      await saveScreenshot(pageToUse, 'login_final-success', 'login');
      return;
    } catch (err) {
      const found502 = await is502Page(currentPage).catch(() => false);
      const msg = String(err || '');
      const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
        if ((found502 || closedError) && attempt < MAX_ATTEMPTS) {
        // Detected 502/closed browser — restarting flow
        currentPage = await resetToStart(currentPage);
        continue;
      }
      throw err;
    }
  }
});

