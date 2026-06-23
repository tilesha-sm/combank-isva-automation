process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && /punycode/i.test(warning.message)) {
    return;
  }
});

import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Read current run number
const runFile = path.join(__dirname, 'artifacts', 'screenshots', '.current-run');
let currentRun = 'run-001';
if (fs.existsSync(runFile)) {
  try {
    currentRun = fs.readFileSync(runFile, 'utf8').trim();
  } catch (e) {
    // Fallback to default
  }
}

const outputDirBase = path.join('artifacts', 'screenshots', currentRun);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }],
  ],

  outputDir: outputDirBase,
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    launchOptions: {
      slowMo: 500,
    },
  },

  projects: [
    {
      name: 'Chrome',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      },
      outputDir: path.join(outputDirBase, 'Chrome'),
    },
    {
      name: 'Edge',
      use: {
        browserName: 'chromium',
        channel: 'msedge',
      },
      outputDir: path.join(outputDirBase, 'Edge'),
    },
    {
      name: 'Chromium',
      use: {
        browserName: 'chromium',
      },
      outputDir: path.join(outputDirBase, 'Chromium'),
    },
    {
      name: 'Firefox',
      use: {
        browserName: 'firefox',
      },
      outputDir: path.join(outputDirBase, 'Firefox'),
    },
    {
      name: 'WebKit',
      use: {
        browserName: 'webkit',
      },
      outputDir: path.join(outputDirBase, 'WebKit'),
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 7'],
      },
      outputDir: path.join(outputDirBase, 'Mobile Chrome'),
    },
  ],
});
