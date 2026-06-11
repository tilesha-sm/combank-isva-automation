import { expect, test } from '@playwright/test';
import { fillOtpInputs, waitForAndClick, waitForOtpInputs } from './otp-utils';
import { resetToStart as resetFlowToStart } from './flow-utils';
import { saveScreenshot } from './screenshot-utils';

const VALID_FORGOT_USERNAME = 'pasanqa1';
const NON_EXISTENT_USERNAME = 'no.such.user.1234';
const INVALID_FORMAT_USERNAME = 'bad!user';
const WRONG_OTP = '000000';

test.setTimeout(90000);

// Ensure individual negative cases run sequentially in this spec.
test.describe('Forgot Password negative cases', () => {
  test.describe.configure({ mode: 'serial' });

  test('Empty username field shows validation error', async ({ page }) => {
    await resetFlowToStart(page);

    await waitForAndClick(page, '#home_forgot_Password', 'Forgot password link', 15000);
    await page.waitForLoadState('networkidle');
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await expect(fpUsername).toBeVisible({ timeout: 15000 });

    await fpUsername.fill('');
    await fpUsername.press('Tab');

    await expect(page.locator('#next')).toBeDisabled({ timeout: 15000 });

    const validation = page.locator('text=/username.*required|please enter.*username|required/i');
    await expect(validation.first()).toBeVisible({ timeout: 15000 });
    await saveScreenshot(page, 'fp-empty-username-error');

    await expect(fpUsername).toBeVisible();
  });

  test('Non-existent username shows error message', async ({ page }) => {
    await resetFlowToStart(page);

    await waitForAndClick(page, '#home_forgot_Password', 'Forgot password link', 15000);
    await page.waitForLoadState('networkidle');
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await expect(fpUsername).toBeVisible({ timeout: 15000 });

    await fpUsername.fill(NON_EXISTENT_USERNAME);
    await page.locator('#next').click();
    await page.waitForLoadState('networkidle');

    const notFoundError = page.locator('text=/please provide a valid username|not found|does not exist|invalid username|username.*invalid/i');
    await expect(notFoundError.first()).toBeVisible({ timeout: 20000 });
    await saveScreenshot(page, 'fp-nonexistent-user-error');
    await expect(fpUsername).toBeVisible();
  });

  test('Invalid username format shows validation error', async ({ page }) => {
    await resetFlowToStart(page);

    await waitForAndClick(page, '#home_forgot_Password', 'Forgot password link', 15000);
    await page.waitForLoadState('networkidle');
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await expect(fpUsername).toBeVisible({ timeout: 15000 });

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
    await resetFlowToStart(page);

    await waitForAndClick(page, '#home_forgot_Password', 'Forgot password link', 15000);
    const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
    await expect(fpUsername).toBeVisible({ timeout: 15000 });

    await fpUsername.fill(VALID_FORGOT_USERNAME);
    await page.locator('#next').click();

    const gotItBtn = page.locator('text=Got it');
    if (await gotItBtn.count()) {
      await gotItBtn.click({ force: true });
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
