import { expect, test } from '@playwright/test';
import { fillOtpInputs, selectOtpMethod, waitForOtpInputs } from '../src/utils/otp-utils';
import { resetToStart as resetFlowToStart } from '../src/utils/flow-utils';
import { setupAutoScreenshots, captureScreenAtStep } from '../src/utils/screenshot-utils';

const VALID_USERNAME = 'Tilesha04';
const VALID_PASSWORD = 'Combank@123';
const WRONG_PASSWORD = 'WrongPass111!';
const INVALID_FORMAT_USERNAME = 'invalid!user';
const WRONG_OTP = '000000';
const USERNAME_FIELD = '#username';
const PASSWORD_FIELD = 'input[type="password"]';
const LOGIN_BUTTON = '#loginBtn';

test.setTimeout(150000);

// Ensure individual negative cases run sequentially in this spec.
test.describe('Login negative cases', () => {
  test.describe.configure({ mode: 'serial' });

  test('Empty username and password keeps login disabled', async ({ page }) => {
    await setupAutoScreenshots(page);
    
    page = await resetFlowToStart(page);
    await captureScreenAtStep(page, 'login-page-opened');

    await page.locator(USERNAME_FIELD).fill('');
    await page.locator(PASSWORD_FIELD).fill('');
    await captureScreenAtStep(page, 'empty-credentials');

    await expect(page.locator(LOGIN_BUTTON)).toBeDisabled();
    await captureScreenAtStep(page, 'login-button-disabled');
    
    await expect(page.locator(USERNAME_FIELD)).toBeVisible();
    await captureScreenAtStep(page, 'test-passed');
  });

  test('Valid username with wrong password shows login error', async ({ page }) => {
    await setupAutoScreenshots(page);
    
    page = await resetFlowToStart(page);
    await captureScreenAtStep(page, 'login-page-opened');

    await page.locator(USERNAME_FIELD).fill(VALID_USERNAME);
    await page.locator(PASSWORD_FIELD).fill(WRONG_PASSWORD);
    await captureScreenAtStep(page, 'wrong-password-entered');
    
    await page.locator(LOGIN_BUTTON).click();
    await captureScreenAtStep(page, 'login-attempted');

    const loginError = page.locator('text=/invalid|incorrect|wrong|failed/i');
    await expect(loginError.first()).toBeVisible({ timeout: 15000 });
    await captureScreenAtStep(page, 'error-message-displayed');
    
    await expect(page.locator(USERNAME_FIELD)).toBeVisible();
    await captureScreenAtStep(page, 'test-passed');
  });

  test('Blank username with valid password keeps login disabled', async ({ page }) => {
    await setupAutoScreenshots(page);
    
    page = await resetFlowToStart(page);
    await captureScreenAtStep(page, 'login-page-opened');

    await page.locator(USERNAME_FIELD).fill('');
    await page.locator(PASSWORD_FIELD).fill(VALID_PASSWORD);
    await captureScreenAtStep(page, 'blank-username-with-password');

    await expect(page.locator(LOGIN_BUTTON)).toBeDisabled();
    await captureScreenAtStep(page, 'login-button-disabled');
    
    await expect(page.locator(USERNAME_FIELD)).toBeVisible();
    await captureScreenAtStep(page, 'test-passed');
  });

  test('Wrong OTP entered on the OTP screen shows authentication error', async ({ page }) => {
    await setupAutoScreenshots(page);
    
    page = await resetFlowToStart(page);
    await captureScreenAtStep(page, 'login-page-opened');

    await page.locator(USERNAME_FIELD).fill(VALID_USERNAME);
    await page.locator(PASSWORD_FIELD).fill(VALID_PASSWORD);
    await captureScreenAtStep(page, 'credentials-entered');
    
    await page.locator(LOGIN_BUTTON).click();
    await captureScreenAtStep(page, 'login-button-clicked');

    await page.waitForLoadState('load');
    await page.waitForLoadState('networkidle');
    await captureScreenAtStep(page, 'after-login-wait');

    const gotItBtn = page.locator('text=/Got it/i').first();
    if (await gotItBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
      await captureScreenAtStep(page, 'dialog-dismissed');
    }

    const otpMethodSelected = await selectOtpMethod(page, 45000);
    const otpInputsPresent = await waitForOtpInputs(page, 5000).then(() => true).catch(() => false);
    if (!otpMethodSelected && !otpInputsPresent) {
      throw new Error('OTP method selection failed in login negative flow');
    }
    await captureScreenAtStep(page, 'otp-method-selected');

    await waitForOtpInputs(page, 45000);
    await fillOtpInputs(page, WRONG_OTP);
    await captureScreenAtStep(page, 'wrong-otp-entered');

    const submitButton = page.locator('button[type="submit"],button:has-text("Submit"),button:has-text("Continue"),button:has-text("Verify")').first();
    if (await submitButton.count()) {
      await submitButton.click({ force: true });
    } else {
      await page.keyboard.press('Enter');
    }
    await captureScreenAtStep(page, 'otp-submitted');

    const otpError = page.locator('text=/invalid|incorrect|wrong otp|authentication failed|verification failed/i');
    await expect(otpError.first()).toBeVisible({ timeout: 30000 });
    await captureScreenAtStep(page, 'otp-error-displayed');
  });
});
