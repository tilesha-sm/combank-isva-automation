import { Page } from '@playwright/test';

export async function waitForAndClick(page: Page, selector: string, label: string, timeoutMs = 10000) {
  const locator = page.locator(selector).first();

  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    await locator.click({ force: true });
    return true;
  } catch {
    return false;
  }
}

export async function clickForgotPassword(page: Page, timeoutMs = 15000) {
  const selectors = [
    '#home_forgot_Password',
    'a:has-text("Forgot password")',
    'button:has-text("Forgot password")',
    'text=/Forgot password\s*\?/i',
    'text=/Forgot password/i',
  ];

  for (const selector of selectors) {
    const clicked = await waitForAndClick(page, selector, `Forgot password link (${selector})`, timeoutMs);
    if (clicked) {
      return true;
    }
  }

  return false;
}

export async function selectOtpMethod(page: Page, timeoutMs = 45000) {
  // Check if OTP inputs are already visible
  try {
    const inputs = await waitForOtpInputs(page, 3000);
    if (inputs.length > 0) return true;
  } catch {
    // No inputs yet, continue to selection
  }

  const deadline = Date.now() + timeoutMs;

  // Primary selector targeting email OTP button by role
  const emailButton = page.getByRole('button', { name: /request otp to email|email.*otp|otp.*email/i }).first();

  // Additional fallback candidates
  const candidates = [
    emailButton,
    page.getByRole('button', { name: /request otp to email/i }).first(),
    page.getByRole('button', { name: /email/i }).first(),
    page.locator('button:has-text("Request OTP to email")').first(),
    page.locator('button').filter({ hasText: /request otp to email/i }).first(),
  ];

  for (const locator of candidates) {
    const remainingMs = Math.max(1000, deadline - Date.now());
    if (remainingMs <= 0) break;

    try {
      const visible = await locator.isVisible({ timeout: Math.min(3000, remainingMs) }).catch(() => false);
      if (visible) {
        // Ensure button is enabled and stable
        try {
          await locator.isEnabled({ timeout: 2000 });
        } catch {
          continue;
        }

        await locator.click({ force: true, timeout: 5000 });
        
        // Wait for page transition
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
        await page.waitForLoadState('load').catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);

        // Check if OTP inputs appeared
        try {
          const inputs = await waitForOtpInputs(page, 10000);
          if (inputs.length > 0) return true;
        } catch {
          // continue to next selector
        }
      }
    } catch {
      // ignore and continue
    }
  }

  return false;
}

async function findVisibleOtpInputs(page: Page) {
  const strongSelectors = [
    '#otp1,#otp2,#otp3,#otp4,#otp5,#otp6',
    'input[autocomplete="one-time-code"],input[id*="otp"],input[name*="otp"],input[placeholder*="OTP"],input[aria-label*="OTP"],input[aria-label*="One-time Password"],input[aria-label*="verification code"],input[aria-label*="Verification code"]',
    'input[maxlength="1"][type="tel"],input[maxlength="1"][inputmode="numeric"],input[maxlength="1"][pattern="\\d*"]',
  ];
  const genericSelectors = ['input[type="tel"],input[type="text"]'];
  const loginFieldPattern = /user(name)?|email|pass(word)?|login|search|name/i;
  const otpFieldPattern = /otp|one[-\s]?time|verification|security\s?code|passcode/i;
  const otpScreenPattern = /otp|one[-\s]?time|verification\s?code|security\s?code|passcode|request otp|enter.*code/i;

  async function isLikelyOtpInput(locator: any) {
    const id = (await locator.getAttribute('id')) || '';
    const name = (await locator.getAttribute('name')) || '';
    const placeholder = (await locator.getAttribute('placeholder')) || '';
    const ariaLabel = (await locator.getAttribute('aria-label')) || '';
    const autocomplete = (await locator.getAttribute('autocomplete')) || '';
    const inputMode = (await locator.getAttribute('inputmode')) || '';
    const maxLength = (await locator.getAttribute('maxlength')) || '';
    const value = `${id} ${name} ${placeholder} ${ariaLabel} ${autocomplete}`;

    if (loginFieldPattern.test(value)) return false;
    if (otpFieldPattern.test(value)) return true;
    if (autocomplete === 'one-time-code') return true;
    if (/numeric|decimal/i.test(inputMode) && /^[1-8]$/.test(maxLength)) return true;

    return false;
  }

  async function pageHasOtpContext() {
    return page
      .locator(`text=${otpScreenPattern}`)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
  }

  const frames = page.frames();

  for (const selector of strongSelectors) {
    for (const frame of frames) {
      const locator = frame.locator(selector as any);
      const count = await locator.count();
      if (count === 0) continue;

      const visibleLocators = [] as any[];
      for (let i = 0; i < count; i++) {
        const candidate = locator.nth(i);
        const isVisible = await candidate.isVisible().catch(() => false);
        if (!isVisible) continue;
        visibleLocators.push(candidate);
      }

      if (visibleLocators.length > 0) {
        return visibleLocators;
      }
    }
  }

  if (await pageHasOtpContext()) {
    for (const selector of genericSelectors) {
      for (const frame of frames) {
        const locator = frame.locator(selector as any);
        const count = await locator.count();
        if (count === 0) continue;

        const visibleLocators = [] as any[];
        for (let i = 0; i < count; i++) {
          const candidate = locator.nth(i);
          const isVisible = await candidate.isVisible().catch(() => false);
          if (!isVisible) continue;
          if (!(await isLikelyOtpInput(candidate))) continue;
          visibleLocators.push(candidate);
        }

        if (visibleLocators.length > 0) {
          return visibleLocators;
        }
      }
    }
  }

  return [] as any[];
}

export async function waitForOtpInputs(page: Page, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const inputs = await findVisibleOtpInputs(page);
    if (inputs.length > 0) {
      return inputs;
    }
    await page.waitForTimeout(500);
  }

  throw new Error('OTP input fields did not appear within timeout');
}

export async function fillOtpInputs(page: Page, otp: string) {
  const digits = otp.trim().split('');
  const inputs = await waitForOtpInputs(page, 30000);
  
  // If multiple inputs, try to sort by numeric id suffix (otp1, otp2, ...)
  let ordered = inputs;
  try {
    const withId = await Promise.all(
      inputs.map(async (loc) => {
        const id = (await loc.getAttribute('id')) || '';
        return { id, loc };
      })
    );

    const numeric = withId.filter((x) => /otp\d+$/i.test(x.id));
    if (numeric.length === withId.length) {
      numeric.sort((a, b) => {
        const ai = parseInt(a.id.replace(/[^0-9]/g, ''), 10) || 0;
        const bi = parseInt(b.id.replace(/[^0-9]/g, ''), 10) || 0;
        return ai - bi;
      });
      ordered = numeric.map((x) => x.loc);
    }
  } catch (e) {
    // ignore ordering errors and keep DOM order
  }

  if (ordered.length === 1) {
    // Single OTP input - fill entire OTP
    await ordered[0].waitFor({ state: 'visible', timeout: 30000 });
    try {
      await ordered[0].fill(otp);
    } catch {
      // Try click first, then fill
      await ordered[0].click({ force: true });
      await ordered[0].fill(otp);
    }
    return;
  }

  // Multiple OTP inputs - fill them digit-by-digit. This avoids entering the whole
  // code into the first box and then re-filling the remaining fields.
  // Some pages keep only the active box enabled and unlock the next box from
  // oninput/onkeyup handlers.
  const requiredFills = Math.min(ordered.length, digits.length);

  for (let i = 0; i < requiredFills; i++) {
    const input = ordered[i];
    await input.waitFor({ state: 'visible', timeout: 30000 });

    const editableDeadline = Date.now() + 30000;
    while (!(await input.isEditable({ timeout: 1000 }).catch(() => false))) {
      if (Date.now() >= editableDeadline) {
        throw new Error(`OTP digit ${i + 1} did not become editable`);
      }
      await page.waitForTimeout(250);
    }

    let filled = false;

    // Try 1: click + type, which triggers the same keyboard handlers as a user.
    try {
      await input.click({ force: true });
      await input.type(digits[i], { delay: 50 });
      filled = true;
    } catch {
      try {
        // Try 2: clear/fill only when the field is editable.
        await input.focus();
        await input.fill(digits[i]);
        filled = true;
      } catch {
        try {
          // Try 3: direct DOM update plus input/keyup events for custom handlers.
          await input.evaluate((element: HTMLInputElement, digit: string) => {
            element.value = digit;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: digit, bubbles: true }));
          }, digits[i]);
          filled = true;
        } catch {
          // Continue to the explicit failure below.
        }
      }
    }

    if (!filled) {
      throw new Error(`Unable to fill OTP digit ${i + 1}`);
    }

    await page.waitForTimeout(100);
  }
}
