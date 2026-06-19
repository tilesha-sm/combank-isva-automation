import { Page } from '@playwright/test';

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
    // Quick checks: title, visible texts
    const title = await page.title().catch(() => '');
    if (/502|Bad Gateway/i.test(title)) return true;

    const content = await page.content().catch(() => '');
    if (/502 Bad Gateway|Bad Gateway|502/i.test(content)) return true;

    // visible locator checks
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
    // If page state cannot be read, continue and attempt navigation.
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
