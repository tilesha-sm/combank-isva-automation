import { expect, test } from '@playwright/test';
import { fillOtpInputs, waitForAndClick, waitForOtpInputs } from './otp-utils';
import { resetToStart as resetFlowToStart } from './flow-utils';
import { saveScreenshot } from './screenshot-utils';

const VALID_USERNAME = 'Tilesha04';
const VALID_PASSWORD = 'Combank@123';
const WRONG_PASSWORD = 'WrongPass111!';
const INVALID_FORMAT_USERNAME = 'invalid!user';
const WRONG_OTP = '000000';
const USERNAME_FIELD = '#username';
const PASSWORD_FIELD = 'input[type="password"]';
const LOGIN_BUTTON = '#loginBtn';

test.setTimeout(90000);

// Ensure individual negative cases run sequentially in this spec.
test.describe('Login negative cases', () => {
  test.describe.configure({ mode: 'serial' });

  test('Empty username and password keeps login disabled', async ({ page }) => {
    await resetFlowToStart(page);

    await page.locator(USERNAME_FIELD).fill('');
    await page.locator(PASSWORD_FIELD).fill('');

    await expect(page.locator(LOGIN_BUTTON)).toBeDisabled();
    await saveScreenshot(page, 'login-empty-fields-disabled');
    await expect(page.locator(USERNAME_FIELD)).toBeVisible();
  });

  test('Valid username with wrong password shows login error', async ({ page }) => {
    await resetFlowToStart(page);

    await page.locator(USERNAME_FIELD).fill(VALID_USERNAME);
    await page.locator(PASSWORD_FIELD).fill(WRONG_PASSWORD);
    await page.locator(LOGIN_BUTTON).click();

    const loginError = page.locator('text=/invalid|incorrect|wrong|failed/i');
    await expect(loginError.first()).toBeVisible({ timeout: 15000 });
    await saveScreenshot(page, 'login-wrong-password-error');
    await expect(page.locator(USERNAME_FIELD)).toBeVisible();
  });

  test('Blank username with valid password keeps login disabled', async ({ page }) => {
    await resetFlowToStart(page);

    await page.locator(USERNAME_FIELD).fill('');
    await page.locator(PASSWORD_FIELD).fill(VALID_PASSWORD);

    await expect(page.locator(LOGIN_BUTTON)).toBeDisabled();
    await expect(page.locator(USERNAME_FIELD)).toBeVisible();
  });

  test('Wrong OTP entered on the OTP screen shows authentication error', async ({ page }) => {
    await resetFlowToStart(page);

    await page.locator(USERNAME_FIELD).fill(VALID_USERNAME);
    await page.locator(PASSWORD_FIELD).fill(VALID_PASSWORD);
    await page.locator(LOGIN_BUTTON).click();

    await page.waitForLoadState('load');
    await page.waitForLoadState('networkidle');

    const gotItBtn = page.locator('text=/Got it/i').first();
    if (await gotItBtn.count() && await gotItBtn.isVisible().catch(() => false)) {
      await gotItBtn.click({ force: true });
    }

    const emailSelected = await waitForAndClick(page, 'text=/Request OTP to email/i', 'Email OTP option', 45000);
    if (!emailSelected) {
      await waitForAndClick(page, 'text=/Request OTP to mobile/i', 'Mobile OTP option', 45000);
    }

    let lockDetected = false;
    const otpError = page.locator('text=/invalid|incorrect|wrong otp|authentication failed|verification failed/i');
    const lockError = page.locator('text=/locked|blocked|too many attempts|try again later|account.*locked|otp.*locked|verification.*locked/i');

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
        await saveScreenshot(page, `login-wrong-otp-attempt-${attempt}`);
      } else {
        await expect(lockError.first()).toBeVisible({ timeout: 30000 });
        lockDetected = true;
        await saveScreenshot(page, 'login-otp-locked-final');
      }
    }

    if (!lockDetected) {
      throw new Error('OTP lock state was not reached after 3 failed attempts');
    }
  });
});
