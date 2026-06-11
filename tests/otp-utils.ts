import { Page } from '@playwright/test';

export async function waitForAndClick(page: Page, selector: string, label: string, timeoutMs = 10000) {
  const locator = page.locator(selector).first();

  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    await locator.click({ force: true });
    console.log(`${label} clicked`);
    return true;
  } catch (error: unknown) {
    const message = error && typeof error === 'object' && 'message' in error ? (error as any).message : String(error);
    console.log(`${label} not available within ${timeoutMs}ms`, message);
    return false;
  }
}

async function findVisibleOtpInputs(page: Page) {
    const strongSelectors = [
    '#otp1,#otp2,#otp3,#otp4,#otp5,#otp6',
    'input[autocomplete="one-time-code"],input[id*="otp"],input[name*="otp"],input[placeholder*="OTP"],input[aria-label*="OTP"],input[aria-label*="One-time Password"],input[aria-label*="verification code"],input[aria-label*="Verification code"]',
    'input[maxlength="1"][type="tel"],input[maxlength="1"][inputmode="numeric"],input[maxlength="1"][pattern="\\d*"]',
  ];
  const genericSelectors = ['input[type="tel"],input[type="text"]'];
  const loginFieldPattern = /user(name)?|email|pass(word)?|login|search|name/i;

  async function isLikelyOtpInput(locator: any) {
    const id = (await locator.getAttribute('id')) || '';
    const name = (await locator.getAttribute('name')) || '';
    const placeholder = (await locator.getAttribute('placeholder')) || '';
    const ariaLabel = (await locator.getAttribute('aria-label')) || '';
    const value = `${id} ${name} ${placeholder} ${ariaLabel}`;
    return !loginFieldPattern.test(value);
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
        const isEditable = await candidate.isEditable().catch(() => false);
        if (isEditable) {
          visibleLocators.push(candidate);
        }
      }

      if (visibleLocators.length > 0) {
        return visibleLocators;
      }
    }
  }

  for (const selector of genericSelectors) {
    for (const frame of frames) {
      const locator = frame.locator(selector as any);
      const count = await locator.count();
      if (count === 0) continue;

      const visibleLocators = [] as any[];
      for (let i = 0; i < count; i++) {
        const candidate = locator.nth(i);
        const isEditable = await candidate.isEditable().catch(() => false);
        if (!isEditable) continue;
        if (!(await isLikelyOtpInput(candidate))) continue;
        visibleLocators.push(candidate);
      }

      if (visibleLocators.length > 0) {
        return visibleLocators;
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
    // single input: type the whole OTP so any oninput handler receives full string
    await ordered[0].fill(otp);
    return;
  }

  const fillCount = Math.min(ordered.length, digits.length);

  for (let i = 0; i < fillCount; i++) {
    try {
      await ordered[i].focus();
      // type a single digit to trigger key events and any onkeyup/oninput handlers
      await ordered[i].type(digits[i], { delay: 50 });
      // slight pause to allow focus-shift handlers to run
      await page.waitForTimeout(80);
      // dispatch explicit input and keyup events to ensure handlers run
      try {
        await ordered[i].evaluate((el: HTMLInputElement, d: string) => {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { key: d, bubbles: true }));
        }, digits[i]);
      } catch (e) {
        // ignore evaluation errors
      }
    } catch (e) {
      // fallback to fill
      await ordered[i].fill(digits[i]);
    }
  }

  if (fillCount < digits.length) {
    console.log(`OTP string has ${digits.length} digits but only ${fillCount} input fields were available.`);
  }
}
