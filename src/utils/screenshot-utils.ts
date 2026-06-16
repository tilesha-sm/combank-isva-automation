import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

const SCREENSHOT_BASE_DIR = path.join(process.cwd(), 'artifacts', 'test-artifacts', 'screenshots');
const RUN_DIR_NAME = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const SCREENSHOT_DIR = path.join(SCREENSHOT_BASE_DIR, RUN_DIR_NAME);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let screenshotCounter = 0;

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '')
    .replace(/-+/g, '-');
}

export async function saveScreenshot(page: Page, name: string) {
  try {
    screenshotCounter++;
    const paddedCount = String(screenshotCounter).padStart(3, '0');
    const fileName = `${paddedCount}-${sanitizeFilename(name).replace(/\.png$/i, '')}.png`;
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch (error) {
    console.warn(`Failed to save screenshot: ${error}`);
  }
}

export async function setupAutoScreenshots(page: Page) {
  let actionCounter = 0;

  // Capture screenshot on page navigation
  page.on('framenavigated', async () => {
    await saveScreenshot(page, `page-navigation-${++actionCounter}`);
  });

  // Capture screenshot on dialog/popup
  page.on('dialog', async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await saveScreenshot(page, `dialog-appeared-${++actionCounter}`);
  });

  // Intercept click actions
  const originalClick = page.locator.bind(page);
  page.locator = function(selector: string) {
    const locator = originalClick(selector);
    const originalLocatorClick = locator.click.bind(locator);
    
    locator.click = async function(options?: any) {
      await saveScreenshot(page, `before-click-${++actionCounter}`);
      await originalLocatorClick(options);
      await new Promise(resolve => setTimeout(resolve, 500));
      await saveScreenshot(page, `after-click-${++actionCounter}`);
      return;
    };
    
    return locator;
  };
}

export async function captureScreenAtStep(page: Page, stepName: string) {
  await new Promise(resolve => setTimeout(resolve, 300));
  await saveScreenshot(page, `step-${stepName}`);
}

export const SCREENSHOT_DIR_PATH = SCREENSHOT_DIR;
export const SCREENSHOT_RUN_DIR_NAME = RUN_DIR_NAME;
