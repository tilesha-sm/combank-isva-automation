import { Page } from '@playwright/test';

export const START_URL = 'https://uatisvaext.combank.net/sso.html';

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

export async function resetToStart(page: Page) {
  try {
    await page.context().clearCookies();
  } catch {}
  try {
    await gotoWith502Check(page, START_URL, { waitUntil: 'load', timeout: 120000 });
    await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
  } catch {
    // ignore — caller will detect 502 or failure
  }
}
