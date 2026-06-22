/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

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
      if (/^run-\d{3}$/.test(saved)) return saved;
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
    // Lazy init: calculate run number fresh on first screenshot
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

export async function saveScreenshot(page: Page, name: string, testType: 'login' | 'forgot-password' | 'login-negative' | 'forgot-password-negative' = 'login') {
  try {
    const browserName = (process.env.BROWSER_NAME || 'chromium').toLowerCase().replace(/\s+/g, '-');
    const dir = ensureRunDir(browserName, testType);

    // Determine next 3-digit prefix based on existing files in dir
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
    const fileName = `${paddedCount}-${sanitizeFilename(name).replace(/\.png$/i, '')}.png`;
    const filePath = path.join(dir, fileName);
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
    // Auto-screenshots disabled; use explicit saveScreenshot calls with testType parameter
  });

  // Capture screenshot on dialog/popup
  page.on('dialog', async () => {
    // Auto-screenshots disabled; use explicit saveScreenshot calls with testType parameter
  });

  // Intercept click actions (best-effort; keep lightweight)
  const originalLocator = page.locator.bind(page);
  // Keep the original behavior; do not aggressively snapshot clicks in tests by default.
  page.locator = function (selector: string) {
    const locator = originalLocator(selector);
    // Auto-click screenshots disabled; use explicit saveScreenshot calls instead
    return locator;
  };
}

export function getScreenshotBaseDir() {
  return SCREENSHOT_BASE_DIR;
}

export function getScreenshotRunDirName() {
  return RUN_DIR_NAME;
}
