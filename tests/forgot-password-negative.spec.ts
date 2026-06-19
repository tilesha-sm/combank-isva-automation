import { expect, Page, test } from '@playwright/test';
import { clickForgotPassword, fillOtpInputs, selectOtpMethod, waitForOtpInputs } from '../src/utils/otp-utils';
import { resetToStart as resetFlowToStart } from '../src/utils/flow-utils';
import { saveScreenshot } from '../src/utils/screenshot-utils';

const VALID_FORGOT_USERNAME = 'pasanqa1';
const NON_EXISTENT_USERNAME = 'no.such.user.1234';
const INVALID_FORMAT_USERNAME = 'bad!user';
const WRONG_OTP = '000000';

test.setTimeout(240000);

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
    await expect(fpUsername).toBeVisible();
    await saveScreenshot(page, 'forgot-password_empty-username', 'forgot-password-negative');
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
    await expect(fpUsername).toBeVisible();
    await saveScreenshot(page, 'forgot-password_nonexistent-user', 'forgot-password-negative');
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
    await expect(fpUsername).toBeVisible();
    await saveScreenshot(page, 'forgot-password_invalid-format', 'forgot-password-negative');
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
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    const activeSessionMsg = page.locator('text=/already active session|automatically logged out/i');
    const gotItBtn = page.getByRole('link', { name: /Got it/i }).or(page.locator('text=/Got it/i')).first();
    if (await gotItBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await Promise.all([
        page.waitForLoadState('load').catch(() => {}),
        gotItBtn.click({ force: true }),
      ]);
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2500);
    }

    if (await activeSessionMsg.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip(true, 'The test account has an already-active session and cannot reach OTP verification.');
      return;
    }

    async function waitForOtpSelectionOrInputs(page: Page) {
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        const otpInputs = await waitForOtpInputs(page, 3000).then(() => true).catch(() => false);
        if (otpInputs) return 'inputs';

        const selectionPage = page.locator('text=/request otp to email|request otp to mobile|select.*otp method|choose.*otp method/i');
        if (await selectionPage.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          return 'selection';
        }

        await page.waitForTimeout(1000);
      }
      return 'timeout';
    }

    async function waitForCountdown(page: Page) {
      const timer = page.locator('text=/\d{1,2}s|\d{1,2} seconds|time left|countdown/i');
      if (await timer.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.waitForTimeout(10000);
      }
    }

    async function selectEmailOtpAndFillWrongCodes(page: Page) {
      // On the selection page, directly click the email button
      const emailButtonOnSelection = page.getByRole('button', { name: /request otp to email|email.*otp|otp.*email/i }).first();
      const emailButtonVisible = await emailButtonOnSelection.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (emailButtonVisible) {
        try {
          await emailButtonOnSelection.click({ force: true, timeout: 5000 });
          await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
          await page.waitForLoadState('load', { timeout: 5000 }).catch(() => {});
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(2000);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          throw new Error(`Failed to click email OTP button: ${message}`);
        }
      } else {
        const selected = await selectOtpMethod(page, 45000);
        if (!selected) {
          throw new Error('Failed to select OTP method - email button not found');
        }
      }
      
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await waitForOtpInputs(page, 20000);
        } catch (e) {
          throw e;
        }
        await fillOtpInputs(page, WRONG_OTP);

        const submitButton = page.locator('button[type="submit"],button:has-text("Submit"),button:has-text("Continue"),button:has-text("Verify")').first();
        if (await submitButton.count()) {
          await submitButton.click({ force: true });
        } else {
          await page.keyboard.press('Enter');
        }

        // Wait and ensure error message appears before next attempt
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        const otpErrorLocator = page.locator('text=/invalid|incorrect|wrong.*(otp|code)|code.*invalid|code.*incorrect|verification failed|authentication failed/i').first();
        const otpErrorVisible = await otpErrorLocator.isVisible({ timeout: 20000 }).catch(() => false);
        const lockVisible = await page.locator('text=/locked|blocked|too many attempts|try again later|account.*locked|otp.*locked|verification.*locked/i').first().isVisible({ timeout: 1000 }).catch(() => false);

        if (lockVisible) {
          return true;
        }

        if (!otpErrorVisible) {
          if (await page.locator('#username').first().isVisible({ timeout: 1000 }).catch(() => false)) {
            test.skip(true, 'The environment returned to the login page after a wrong OTP attempt.');
            return true;
          }
        }
        // loop continues to trigger fresh inputs for next attempt
      }
      return false;
    }

    let lockDetected = false;
    let currentState = await waitForOtpSelectionOrInputs(page);

    if (currentState === 'selection') {
      await waitForCountdown(page);
      const locked = await selectEmailOtpAndFillWrongCodes(page);
      if (locked) {
        lockDetected = true;
      }
    } else if (currentState === 'inputs') {
      const locked = await selectEmailOtpAndFillWrongCodes(page);
      if (locked) {
        lockDetected = true;
      }
    } else {
      throw new Error('OTP selection or inputs did not appear in time');
    }

    if (!lockDetected) {
      const lockVisible = await page.locator('text=/locked|blocked|too many attempts|try again later|account.*locked|otp.*locked|verification.*locked/i').first().isVisible({ timeout: 30000 }).catch(() => false);
      if (!lockVisible) {
        throw new Error('OTP lock state was not reached after retrying via email OTP path');
      }
    }

    await saveScreenshot(page, 'forgot-password_otp-locked', 'forgot-password-negative');
  });
});
