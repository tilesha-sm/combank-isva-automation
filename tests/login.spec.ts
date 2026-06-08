import { test } from '@playwright/test';
import { getOtpFromGmail } from '../utils/auth-gmail';

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

test.use({
  headless: false,
});

test('ComBank login', async ({ page }) => {
  await page.goto('https://uatisvaext.combank.net/sso.html', {
    waitUntil: 'load',
  });
  await page.waitForLoadState('networkidle');

  // Login
  await page.locator('#username').fill('testmas7');
  await page.locator('input[type="password"]').fill('Combank@123');
  await page.locator('#loginBtn').click();
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');

  // Handle the active-session warning if it appears after login.
  const gotItBtn = page.locator('text=/Got it/i').first();
  try {
    await gotItBtn.waitFor({ state: 'visible', timeout: 15000 });
    await gotItBtn.click({ force: true });
    console.log('Dismissed active-session warning');
  } catch {
    console.log('No active-session warning found');
  }

  // Wait for the OTP screen to be available.
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await waitForAndClick(page, '#email', 'Email OTP option', 8000);

  // Click the alternate login method if it appears.
  await waitForAndClick(page, 'button#alt_btn', 'Log in another way option', 8000);
  await waitForAndClick(page, 'button#sms', 'Mobile OTP option', 8000);

  // Wait briefly for the resend OTP window to become available.
  await page.waitForTimeout(3000);
  await waitForAndClick(page, 'button#resendButton', 'Resend OTP button', 8000);

  // Repeat the same OTP-mobile resend path once more.
  await waitForAndClick(page, 'button#alt_btn', 'Log in another way option again', 8000);
  await waitForAndClick(page, 'button#sms', 'Mobile OTP option again', 8000);

  await page.waitForTimeout(3000);
  await waitForAndClick(page, 'button#resendButton', 'Resend OTP button again', 8000);

  const otp = await getOtpFromGmail('SecurityVerification@combank.net', null, 10, 30000);
  if (!otp) {
    throw new Error('OTP not found in Gmail');
  }
  console.log('OTP received from email:', otp);
  await fillOtpInputs(page, otp);
});

async function fillOtpInputs(page: any, otp: string) {
  const digits = otp.trim().split('');
  for (let i = 0; i < digits.length; i++) {
    const inputSelector = `#otp${i + 1}`;
    await page.waitForSelector(inputSelector, { state: 'visible', timeout: 10000 });
    await page.focus(inputSelector);
    await page.type(inputSelector, digits[i], { delay: 50 });
  }
}