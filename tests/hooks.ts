import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { saveScreenshot } from '../src/utils';

export const test = base.extend({});
export { expect };
export type { Page };

// Save failure screenshots with browser name prefixed
test.afterEach(async ({ page }, testInfo) => {
  // Ensure browser name is available to helper
  try {
    if (testInfo.project && testInfo.project.name) {
      process.env.BROWSER_NAME = testInfo.project.name;
    }
    if (testInfo.status !== 'passed') {
      const name = testInfo.title || 'test-failure';
      await saveScreenshot(page, name, 'login');
    }
  } catch (e: unknown) {
    // Don't fail the test cleanup if screenshot saving fails
    console.warn('Failed to save failure screenshot:', e instanceof Error ? e.message : e);
  }
});
