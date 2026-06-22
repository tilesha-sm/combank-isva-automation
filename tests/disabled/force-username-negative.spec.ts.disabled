/*import { expect, Page, test } from '@playwright/test';
import { /* removed: getOtpFromGmail */ } from '../src/utils/auth-gmail';
import { /* removed: FORCE_USERNAME_CREDENTIALS, DEFAULT_EMAIL_SENDER */ LOGIN_CREDENTIALS } from '../src/utils/credentials';
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

    const otp = /* mail flow removed for now */ null;
    // await fillOtpInputs(page, otp);
    await page.waitForTimeout(2000);

    const currentUsernameInput = page.locator('#currentUsername, input[name="currentUsername"], input[disabled]:first-of-type').first();
    await expect(currentUsernameInput).toBeVisible({ timeout: 30000 });
    return page;
  }

  test('Invalid new username blocked', async ({ page }) => {
    await reachChangeUsernameScreen(page);

    const newUsernameInput = page.locator('#newUsername, input[name="newUsername"], input[type="text"]:not([disabled])').first();
    const submitButton = page.locator('button[type="submit"], #submitBtn, button:has-text("Submit")').first();

    await newUsernameInput.fill('!invalid-username');

    const errorMessage = page.locator('text=/invalid username|only letters numbers underscores/i');
    await expect(errorMessage.first()).toBeVisible({ timeout: 15000 });
    await expect(submitButton).toBeDisabled();
  });

  test('New username already exists shows error', async ({ page }) => {
    await reachChangeUsernameScreen(page);

    const newUsernameInput = page.locator('#newUsername, input[name="newUsername"], input[type="text"]:not([disabled])').first();
    const submitButton = page.locator('button[type="submit"], #submitBtn, button:has-text("Submit")').first();

    await newUsernameInput.fill(LOGIN_CREDENTIALS[0].username);
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const existsError = page.locator('text=/already exists|is taken|choose another/i');
    await expect(existsError.first()).toBeVisible({ timeout: 15000 });
    await expect(newUsernameInput).toHaveValue('');
    await expect(submitButton).toBeDisabled();
  });
});*/
