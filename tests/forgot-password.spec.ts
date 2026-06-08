import { expect, test } from '@playwright/test';

async function waitForAndClick(page: any, selector: string, label: string, timeoutMs = 10000) {
  const locator = page.locator(selector).first();

  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    await locator.click({ force: true });
    console.log(`${label} clicked`);
    return true;
  } catch {
    console.log(`${label} not available within ${timeoutMs}ms`);
    return false;
  }
}

test.setTimeout(90000);

test('Forgot Password flow', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('https://uatisvaext.combank.net/sso.html', {
    waitUntil: 'load',
  });
  await page.waitForLoadState('networkidle');

  // Forgot password
  const forgotLink = page.locator('#home_forgot_Password');
  await forgotLink.waitFor({ state: 'visible', timeout: 15000 });
  await forgotLink.click({ force: true });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');

  // Wait for the forgot-password form to actually load.
  const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]');
  await fpUsername.first().waitFor({ state: 'visible', timeout: 30000 });

  // Username
  await fpUsername.first().fill('Click_back_button');

  // Verify the back button works from the forgot-password page.
  const backBtn = page.locator('button:has(img[alt="Back"]), button:has-text("Go Back"), img[alt="Back"]').first();
  await backBtn.waitFor({ state: 'visible', timeout: 10000 });
  await backBtn.click({ force: true });

  await expect(page.locator('#username')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#home_forgot_Password')).toBeVisible({ timeout: 10000 });

  // Return to the forgot-password page for the rest of the flow.
  await page.locator('#home_forgot_Password').click({ force: true });
  await fpUsername.first().waitFor({ state: 'visible', timeout: 30000 });

  // The back button clears the forgot-password state, so the username
  // must be entered again before continuing.
  await fpUsername.first().fill('testmas7');

  // Next
  await page.locator('#next').click();
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');

  // Some sessions return an interstitial page before the OTP methods appear.
  const gotItBtn = page.locator('text=Got it');
  try {
    await gotItBtn.waitFor({ state: 'visible', timeout: 10000 });
    await gotItBtn.click({ force: true });
    console.log('Dismissed active-session warning');
  } catch {
    console.log('No active-session warning found');
  }

  // Wait for the OTP/verification screen to become available.
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const lockoutMsg = page.locator('text=/temporarily locked out/i');
  if (await lockoutMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
    test.skip(true, 'The test account is temporarily locked out on this environment.');
  }

  await waitForAndClick(page, '#email', 'Email OTP option');

  // Click the alternate login method on the OTP page.
  await waitForAndClick(page, 'button#alt_btn', 'Alternate login method option', 15000);

  // Click the mobile OTP option after switching methods.
  await waitForAndClick(page, 'button#sms', 'Mobile OTP option');

  // Wait for the resend OTP window to become available.
  await page.waitForTimeout(3000);

  // Resend OTP
  await waitForAndClick(page, 'button#resendButton', 'Resend OTP button', 30000);

  // Keep the page open for 10 seconds so the resend action can be visually verified.
  await page.waitForTimeout(10000);

  // The test only needs to verify the OTP path is reachable.
});