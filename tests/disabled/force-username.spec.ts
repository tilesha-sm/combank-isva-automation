/*import { expect, test } from '@playwright/test';
import { /* removed: getOtpFromGmail */ } from '../src/utils/auth-gmail';
import { /* removed: FORCE_USERNAME_CREDENTIALS, */ DEFAULT_EMAIL_SENDER } from '../src/utils/credentials';
import { fillOtpInputs, selectOtpMethod, waitForOtpInputs } from '../src/utils/otp-utils';
import { is502Page, resetToStart } from '../src/utils/flow-utils';
import { saveScreenshot } from '../src/utils/screenshot-utils';

test.setTimeout(180000);

test.use({
  headless: false,
});

test('Force username change flow', async ({ page }) => {
  const MAX_ATTEMPTS = 3;
  let currentPage = page;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      currentPage = await resetToStart(currentPage);
      const pageToUse = currentPage;

      await pageToUse.locator('#username').fill(FORCE_USERNAME_CREDENTIALS.username);
      await pageToUse.locator('input[type="password"]').fill(FORCE_USERNAME_CREDENTIALS.password);
      await pageToUse.locator('#loginBtn').click();
      await pageToUse.waitForLoadState('load');
      await pageToUse.waitForLoadState('networkidle');

      const gotItBtn = pageToUse.locator('text=/Got it/i').first();
      try {
        await gotItBtn.waitFor({ state: 'visible', timeout: 15000 });
        await gotItBtn.click({ force: true });
      } catch {
        // no active-session warning found
      }

      await pageToUse.waitForLoadState('load');
      await pageToUse.waitForLoadState('networkidle');
      await pageToUse.waitForTimeout(2000);

      const otpMethodSelected = await selectOtpMethod(pageToUse, 45000);
      if (!otpMethodSelected) {
        throw new Error('OTP option not available in force-username flow.');
      }

      await pageToUse.waitForTimeout(2000);
      await waitForOtpInputs(pageToUse, 90000);

      const otp = /* mail flow removed for now */ null;
      // await fillOtpInputs(pageToUse, otp);
      await pageToUse.waitForTimeout(2000);

      if (await is502Page(pageToUse)) {
        throw new Error('Detected 502 Bad Gateway after OTP entry');
      }

      const currentUsernameInput = pageToUse.locator('#currentUsername, input[name="currentUsername"], input[disabled]:first-of-type').first();
      const newUsernameInput = pageToUse.locator('#newUsername, input[name="newUsername"], input[type="text"]:not([disabled])').first();
      const submitButton = pageToUse.locator('button[type="submit"], #submitBtn, button:has-text("Submit")').first();
      const usernamePolicyLink = pageToUse.locator('text=/Username Policy/i, a:has-text("Username Policy")').first();

      await expect(currentUsernameInput).toBeVisible();
      await expect(currentUsernameInput).toBeDisabled();
      await expect(newUsernameInput).toBeVisible();
      await expect(newUsernameInput).toBeEnabled();
      await expect(usernamePolicyLink).toBeVisible();
      await expect(submitButton).toBeDisabled();

      await usernamePolicyLink.click();
      const policyPopup = pageToUse.locator('role=dialog, [role="dialog"], .modal, .popup');
      await expect(policyPopup.first()).toBeVisible({ timeout: 15000 });

      const closePolicyButton = pageToUse.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("×"), button:has-text("X")').first();
      await closePolicyButton.click({ force: true });

      await expect(currentUsernameInput).toBeVisible();
      await expect(newUsernameInput).toBeVisible();
      await expect(submitButton).toBeDisabled();

      await newUsernameInput.fill(FORCE_USERNAME_CREDENTIALS.newUsername);
      await expect(submitButton).toBeEnabled();

      // Close the page without clicking submit to preserve the account for reuse
      await pageToUse.close();
      return;
    } catch (err) {
      const found502 = await is502Page(currentPage).catch(() => false);
      const msg = String(err || '');
      const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
      if ((found502 || closedError) && attempt < MAX_ATTEMPTS) {
        currentPage = await resetToStart(currentPage);
        continue;
      }
      throw err;
    }
  }
});*/
