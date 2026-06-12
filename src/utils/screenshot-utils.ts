import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

const SCREENSHOT_BASE_DIR = path.join(process.cwd(), 'artifacts', 'test-artifacts', 'screenshots');
const RUN_DIR_NAME = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const SCREENSHOT_DIR = path.join(SCREENSHOT_BASE_DIR, RUN_DIR_NAME);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '')
    .replace(/-+/g, '-');
}

export async function saveScreenshot(page: Page, name: string) {
  const fileName = `${sanitizeFilename(name).replace(/\.png$/i, '')}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

export const SCREENSHOT_DIR_PATH = SCREENSHOT_DIR;
export const SCREENSHOT_RUN_DIR_NAME = RUN_DIR_NAME;
