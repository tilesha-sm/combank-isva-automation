import { expect, test } from '@playwright/test';
import { clickForgotPassword, fillOtpInputs, selectOtpMethod, waitForOtpInputs } from '../src/utils/otp-utils';
import { resetToStart as resetFlowToStart } from '../src/utils/flow-utils';
import { saveScreenshot } from '../src/utils/screenshot-utils';

const VALID_FORGOT_USERNAME = 'pasanqa1';
const NON_EXISTENT_USERNAME = 'no.such.user.1234';
const INVALID_FORMAT_USERNAME = 'bad!user';
const WRONG_OTP = '000000';

test.setTimeout(150000);

// Ensure individual negative cases run sequentially in this spec.
test.describe('Forgot Password negative cases', () => {
  test.describe.configure({ mode: 'serial' });

  test('Empty username field shows validation error', async ({ page }) => {
    page = await resetFlowToStart(page);

    const forgotClicked = await clickForgotPassword(page, 15000);
    if (!forgotClicked) {
      throw new Error('Unable to open forgot password flow');
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await fpUsername.waitFor({ state: 'visible', timeout: 30000 });

    await fpUsername.fill('');
    await fpUsername.press('Tab');

    await expect(page.locator('#next')).toBeDisabled({ timeout: 15000 });

    const validation = page.locator('text=/username.*required|please enter.*username|required/i');
    await expect(validation.first()).toBeVisible({ timeout: 15000 });
    await saveScreenshot(page, 'fp-empty-username-error');

    await expect(fpUsername).toBeVisible();
  });

  test('Non-existent username shows error message', async ({ page }) => {
    page = await resetFlowToStart(page);

    const forgotClicked = await clickForgotPassword(page, 15000);
    if (!forgotClicked) {
      throw new Error('Unable to open forgot password flow');
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await fpUsername.waitFor({ state: 'visible', timeout: 30000 });

    await fpUsername.fill(NON_EXISTENT_USERNAME);
    await page.locator('#next').click();
    await page.waitForLoadState('networkidle');

    const notFoundError = page.locator('text=/please provide a valid username|not found|does not exist|invalid username|username.*invalid/i');
    await expect(notFoundError.first()).toBeVisible({ timeout: 20000 });
    await saveScreenshot(page, 'fp-nonexistent-user-error');
    await expect(fpUsername).toBeVisible();
  });

  test('Invalid username format shows validation error', async ({ page }) => {
    page = await resetFlowToStart(page);

    const forgotClicked = await clickForgotPassword(page, 15000);
    if (!forgotClicked) {
      throw new Error('Unable to open forgot password flow');
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await fpUsername.waitFor({ state: 'visible', timeout: 30000 });

    await fpUsername.fill(INVALID_FORMAT_USERNAME);
    await page.locator('#next').click();
    await page.waitForLoadState('networkidle');

    const invalidFormatError = page.locator('text=/invalid username|special characters|please enter a valid username|please provide a valid username|username.*invalid|format.*username|username.*format/i');
    await expect(invalidFormatError.first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#next')).toBeDisabled({ timeout: 15000 });
    await saveScreenshot(page, 'fp-invalid-format-error');

    await expect(fpUsername).toBeVisible();
  });

  test('Wrong OTP entered three times during reset eventually locks verification', async ({ page }) => {
    page = await resetFlowToStart(page);

    const forgotClicked = await clickForgotPassword(page, 15000);
    if (!forgotClicked) {
      throw new Error('Unable to open forgot password flow');
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await fpUsername.waitFor({ state: 'visible', timeout: 30000 });

    await fpUsername.fill(VALID_FORGOT_USERNAME);
    await page.locator('#next').click();

    const gotItBtn = page.locator('text=/Got it/i').first();
    if (await gotItBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2500);
    }

    const otpMethodSelected = await selectOtpMethod(page, 45000);
    const otpInputsPresent = await waitForOtpInputs(page, 5000).then(() => true).catch(() => false);
    if (!otpMethodSelected && !otpInputsPresent) {
      const activeSessionMsg = page.locator('text=/already active session|automatically logged out/i');
      if (await activeSessionMsg.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        test.skip(true, 'The test account has an already-active session and cannot reach OTP verification.');
        return;
      }
      const sessionTimeoutMsg = page.locator('text=/session.*timeout|session has ended|login again/i');
      if (await sessionTimeoutMsg.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        test.skip(true, 'The environment ended the forgot-password session before OTP verification was available.');
        return;
      }
      throw new Error('OTP method selection failed after dismissing active-session warning');
    }

    const otpError = page.locator('text=/invalid|incorrect|wrong otp|verification failed|authentication failed/i');
    const lockError = page.locator('text=/locked|blocked|too many attempts|try again later|account.*locked|otp.*locked|verification.*locked/i');
    let lockDetected = false;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await waitForOtpInputs(page, 90000);
      await fillOtpInputs(page, WRONG_OTP);

      const submitButton = page.locator('button[type="submit"],button:has-text("Submit"),button:has-text("Continue"),button:has-text("Verify")').first();
      if (await submitButton.count()) {
        await submitButton.click({ force: true });
      } else {
        await page.keyboard.press('Enter');
      }

      if (attempt < 3) {
        await expect(otpError.first()).toBeVisible({ timeout: 20000 });
        await saveScreenshot(page, `fp-wrong-otp-attempt-${attempt}`);
      } else {
        await expect(lockError.first()).toBeVisible({ timeout: 30000 });
        lockDetected = true;
        await saveScreenshot(page, 'fp-otp-locked-final');
      }
    }

    if (!lockDetected) {
      throw new Error('OTP lock state was not reached after 3 failed attempts');
    }
  });
});
