import { expect, Page, test } from '@playwright/test';
import { getOtpFromGmail } from '../src/utils/auth-gmail';
import { FORCE_USERNAME_CREDENTIALS, LOGIN_CREDENTIALS, DEFAULT_EMAIL_SENDER } from '../src/utils/credentials';
import { fillOtpInputs, selectOtpMethod, waitForOtpInputs } from '../src/utils/otp-utils';
import { resetToStart } from '../src/utils/flow-utils';
import { saveScreenshot } from '../src/utils/screenshot-utils';

test.setTimeout(150000);

test.describe.configure({ mode: 'serial' });

test.describe('Force username negative cases', () => {
  async function reachChangeUsernameScreen(page: Page) {
    page = await resetToStart(page);

    await page.locator('#username').fill(FORCE_USERNAME_CREDENTIALS.username);
    await page.locator('input[type="password"]').fill(FORCE_USERNAME_CREDENTIALS.password);
    await page.locator('#loginBtn').click();
    await page.waitForLoadState('load');
    await page.waitForLoadState('networkidle');

    const gotItBtn = page.locator('text=/Got it/i').first();
    if (await gotItBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
    }

    await page.waitForTimeout(2000);
    const otpMethodSelected = await selectOtpMethod(page, 45000);
    if (!otpMethodSelected) {
      throw new Error('OTP option not available in force-username-negative flow.');
    }

    await page.waitForTimeout(2000);
    await waitForOtpInputs(page, 90000);

    const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
    if (!otp) {
      throw new Error('OTP not found in Gmail');
    }
    await fillOtpInputs(page, otp);
    await page.waitForTimeout(2000);

    const currentUsernameInput = page.locator('#currentUsername, input[name="currentUsername"], input[disabled]:first-of-type').first();
    await expect(currentUsernameInput).toBeVisible({ timeout: 30000 });
    return page;
  }

  test('Empty new username keeps submit disabled', async ({ page }) => {
    await reachChangeUsernameScreen(page);

    const newUsernameInput = page.locator('#newUsername, input[name="newUsername"], input[type="text"]:not([disabled])').first();
    const submitButton = page.locator('button[type="submit"], #submitBtn, button:has-text("Submit")').first();

    await newUsernameInput.fill('');
    await expect(submitButton).toBeDisabled();
  });

  test('Capital letters in username keeps submit disabled', async ({ page }) => {
    await reachChangeUsernameScreen(page);

    const newUsernameInput = page.locator('#newUsername, input[name="newUsername"], input[type="text"]:not([disabled])').first();
    const submitButton = page.locator('button[type="submit"], #submitBtn, button:has-text("Submit")').first();

    await newUsernameInput.fill('TestUser123');
    await expect(submitButton).toBeDisabled();
  });

  test('Already existing username shows error', async ({ page }) => {
    await reachChangeUsernameScreen(page);

    const newUsernameInput = page.locator('#newUsername, input[name="newUsername"], input[type="text"]:not([disabled])').first();
    const submitButton = page.locator('button[type="submit"], #submitBtn, button:has-text("Submit")').first();

    const existingUsername = LOGIN_CREDENTIALS[0]?.username.toLowerCase() ?? 'existinguser';
    await newUsernameInput.fill(existingUsername);
    await submitButton.click();

    const existsError = page.locator('text=/already exists|please try again/i');
    await expect(existsError.first()).toBeVisible({ timeout: 15000 });
    await expect(newUsernameInput).toHaveValue('');
    await expect(submitButton).toBeDisabled();
  });
});