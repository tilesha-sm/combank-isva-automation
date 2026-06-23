/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

// ============= FLOW UTILITIES =============
export const START_URL = 'https://uatisvaext.combank.net/mga/sps/oauth/oauth20/authorize?response_type=code&client_id=iCashProGUISSO&redirect_uri=https%3A%2F%2Ftest.com%2Fcallback&scope=openid&state=76677667';

const CLOSED_PAGE_REGEX = /closed/i;

export function isClosedPageError(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? (error as any).message
      : String(error);
  return CLOSED_PAGE_REGEX.test(message) || /Target page, context or browser has been closed/i.test(message as string);
}

export async function is502Page(page: Page): Promise<boolean> {
  try {
    const title = await page.title().catch(() => '');
    if (/502|Bad Gateway/i.test(title)) return true;

    const content = await page.content().catch(() => '');
    if (/502 Bad Gateway|Bad Gateway|502/i.test(content)) return true;

    if (await page.locator('text=/502/').first().isVisible().catch(() => false)) return true;
    if (await page.locator('text=/Bad Gateway/i').first().isVisible().catch(() => false)) return true;

    return false;
  } catch {
    return false;
  }
}

export async function gotoWith502Check(page: Page, url: string, options: Parameters<Page['goto']>[1] = {}) {
  const response = await page.goto(url, options);
  if (response?.status() === 502) {
    throw new Error('Detected 502 Bad Gateway on navigation');
  }
  return response;
}

export async function resetToStart(page: Page): Promise<Page> {
  try {
    if (page.isClosed()) {
      return page.context().newPage();
    }
  } catch {
    // continue
  }

  try {
    await page.context().clearCookies();
  } catch {}

  try {
    if (page.isClosed()) {
      return page.context().newPage();
    }
    await gotoWith502Check(page, START_URL, { waitUntil: 'load', timeout: 120000 });
    await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
    return page;
  } catch (error) {
    if (isClosedPageError(error)) {
      return page.context().newPage();
    }
    return page;
  }
}

// ============= OTP UTILITIES =============
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

async function waitForForgotPasswordForm(page: Page, timeoutMs = 10000) {
  const selector = '#FPUsername, input[name="FPUsername"]';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await page.locator(selector).first().isVisible({ timeout: Math.min(1000, deadline - Date.now()) }).catch(() => false)) {
      return true;
    }
    await page.waitForTimeout(250);
  }

  return false;
}

export async function clickForgotPassword(page: Page, timeoutMs = 15000) {
  const selectors = [
    '#home_forgot_Password',
    'a:has-text("Forgot password")',
    'button:has-text("Forgot password")',
    'text=/Forgot password\\s*\\?/i',
    'text=/Forgot password/i',
  ];

  const deadline = Date.now() + timeoutMs;

  for (const selector of selectors) {
    const remaining = Math.max(1000, deadline - Date.now());
    const clicked = await waitForAndClick(page, selector, `Forgot password link (${selector})`, remaining);
    if (!clicked) {
      continue;
    }

    await page.waitForLoadState('networkidle').catch(() => {});
    const gotForm = await waitForForgotPasswordForm(page, Math.min(10000, deadline - Date.now()));
    if (gotForm) {
      return true;
    }
  }

  return false;
}

export async function selectOtpMethod(page: Page, timeoutMs = 45000) {
  try {
    const inputs = await waitForOtpInputs(page, 3000);
    if (inputs.length > 0) return true;
  } catch {
    // No inputs yet
  }

  const deadline = Date.now() + timeoutMs;
  await page
    .locator('text=/Please select a method to receive your verification code|Two Factor Authentication/i')
    .first()
    .waitFor({ state: 'visible', timeout: Math.min(15000, deadline - Date.now()) })
    .catch(() => {});

  const emailButton = page.locator('#email').first();
  const fallbackButtons = [
    page.locator('button#email').first(),
    page.locator('button:has-text("Request OTP to email")').first(),
    page.getByRole('button', { name: /request otp to email|email.*otp|otp.*email/i }).first(),
    page.locator('text=/Request OTP to email/i').first(),
  ];

  const clickCandidate = async (locator: ReturnType<Page['locator']>) => {
    const visible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) return false;
    const enabled = await locator.isEnabled({ timeout: 2000 }).catch(() => false);
    if (!enabled) return false;

    await locator.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await Promise.all([
        locator.click({ force: true, timeout: 5000 }),
        page.waitForURL(/StateId=|otp.*code|authsvc\?StateId=/, { timeout: 10000 }).catch(() => {}),
      ]);
    } catch {
      return false;
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    return await waitForOtpInputs(page, Math.min(30000, deadline - Date.now()))
      .then((inputs) => inputs.length > 0)
      .catch(() => false);
  };

  if (await clickCandidate(emailButton)) return true;
  for (const button of fallbackButtons) {
    if (await clickCandidate(button)) return true;
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
  if (!inputs || inputs.length === 0) {
    throw new Error('OTP input boxes are not ready — fillOtpInputs called on wrong screen');
  }
  const firstInput = inputs[0];
  try {
    await firstInput.waitFor({ state: 'visible', timeout: 15000 });
    const editableDeadline = Date.now() + 15000;
    while (!(await firstInput.isEditable({ timeout: 1000 }).catch(() => false))) {
      if (Date.now() >= editableDeadline) {
        throw new Error('OTP input boxes are not ready — fillOtpInputs called on wrong screen');
      }
      await page.waitForTimeout(250);
    }
  } catch (e) {
    throw new Error('OTP input boxes are not ready — fillOtpInputs called on wrong screen');
  }

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
    // ignore
  }

  if (ordered.length === 1) {
    await ordered[0].waitFor({ state: 'visible', timeout: 30000 });
    try {
      await ordered[0].fill(otp);
    } catch {
      await ordered[0].click({ force: true });
      await ordered[0].fill(otp);
    }
    return;
  }

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

    try {
      await input.click({ force: true });
      await input.type(digits[i], { delay: 50 });
      filled = true;
    } catch {
      try {
        await input.focus();
        await input.fill(digits[i]);
        filled = true;
      } catch {
        try {
          await input.evaluate((element: HTMLInputElement, digit: string) => {
            element.value = digit;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: digit, bubbles: true }));
          }, digits[i]);
          filled = true;
        } catch {
          // continue
        }
      }
    }

    if (!filled) {
      throw new Error(`Unable to fill OTP digit ${i + 1}`);
    }

    await page.waitForTimeout(100);
  }
}

// ============= SCREENSHOT UTILITIES =============
const SCREENSHOT_BASE_DIR = path.join(process.cwd(), 'artifacts', 'screenshots');
let RUN_DIR_NAME = '';
let SCREENSHOT_DIR = '';
let isInitialized = false;

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '')
    .replace(/-+/g, '-');
}

function calculateNextRunNumber(): string {
  const currentRunFile = path.join(SCREENSHOT_BASE_DIR, '.current-run');
  try {
    if (fs.existsSync(currentRunFile)) {
      const saved = fs.readFileSync(currentRunFile, 'utf-8').trim();
      if (/^run-\d{3}$/.test(saved)) {
        const savedDir = path.join(SCREENSHOT_BASE_DIR, saved);
        if (fs.existsSync(savedDir)) {
          return saved;
        }
      }
    }
  } catch { /* ignore */ }

  try {
    if (!fs.existsSync(SCREENSHOT_BASE_DIR)) {
      fs.mkdirSync(SCREENSHOT_BASE_DIR, { recursive: true });
    }
    const entries = fs.readdirSync(SCREENSHOT_BASE_DIR, { withFileTypes: true })
      .filter((d: any) => d.isDirectory())
      .map((d: any) => d.name);
    const runRegex = /^run-(\d{3})$/;
    let max = 0;
    for (const name of entries) {
      const m = name.match(runRegex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }
    const next = `run-${String(max + 1).padStart(3, '0')}`;
    fs.writeFileSync(currentRunFile, next, 'utf-8');
    return next;
  } catch (e) {
    return 'run-001';
  }
}

function ensureRunDir(browserName = (process.env.BROWSER_NAME || 'chromium'), testType = 'login') {
  if (!isInitialized) {
    RUN_DIR_NAME = calculateNextRunNumber();
    SCREENSHOT_DIR = path.join(SCREENSHOT_BASE_DIR, RUN_DIR_NAME);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    isInitialized = true;
  }

  const browser = (String(browserName || 'chromium')).toLowerCase().replace(/\s+/g, '-');
  const typeDir = String(testType || 'login');
  const fullDir = path.join(SCREENSHOT_DIR, browser, typeDir);
  fs.mkdirSync(fullDir, { recursive: true });
  return fullDir;
}

export async function saveScreenshot(page: Page, name: string, testType: 'login' | 'forgot-password' | 'login-negative' | 'forgot-password-negative' | 'force-password' | 'force-password-negative' | 'force-username' | 'force-username-negative' = 'login') {
  try {
    const browserName = (process.env.BROWSER_NAME || 'chromium').toLowerCase().replace(/\s+/g, '-');
    const dir = ensureRunDir(browserName, testType);

    let counter = 1;
    try {
      const files = fs.readdirSync(dir).filter((f: string) => /^\d{3}-.+\.png$/.test(f));
      if (files.length > 0) {
        let max = 0;
        for (const f of files) {
          const m = f.match(/^(\d{3})-/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n) && n > max) max = n;
          }
        }
        counter = max + 1;
      }
    } catch (e) {
      counter = 1;
    }

    const paddedCount = String(counter).padStart(3, '0');
    const browserDisplay = String(browserName || 'chromium').replace(/\s+/g, '-');
    const fileName = `${browserDisplay}-${paddedCount}-${sanitizeFilename(name).replace(/\.png$/i, '')}.png`;
    const filePath = path.join(dir, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch (error) {
    console.warn(`Failed to save screenshot: ${error}`);
  }
}

export async function setupAutoScreenshots(page: Page) {
  page.on('framenavigated', async () => {});
  page.on('dialog', async () => {});
  const originalLocator = page.locator.bind(page);
  page.locator = function (selector: string) {
    return originalLocator(selector);
  };
}

export function getScreenshotBaseDir() {
  return SCREENSHOT_BASE_DIR;
}

export function getScreenshotRunDirName() {
  return RUN_DIR_NAME;
}
