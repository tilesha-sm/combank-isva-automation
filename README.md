# ComBank ISVA Automation

This repository contains Playwright end-to-end tests for the ComBank ISVA login and forgot-password flows.

## Project Purpose

- Validate ComBank login negative and positive scenarios.
- Validate forgot-password OTP flows and negative cases.
- Centralize test artifacts and manage deprecation warning suppression for Node.

## Prerequisites

- Node.js installed
- Windows PowerShell (used by npm scripts in this repo)
- Chrome installed for the `Chrome` Playwright project

## Install Dependencies

```powershell
npm install
```

## Run Tests

### Run the full Playwright suite

```powershell
npx playwright test
```

### Run only one browser to keep execution time shorter

```powershell
npx playwright test --project=Chrome --workers=1
```

### Run tests with more workers

Because `playwright.config.ts` currently sets `workers: 1`, you can override this on the command line:

```powershell
npx playwright test --workers=4
```

If you use the npm script, pass extra arguments after `--`:

```powershell
npm run test:no-deprecation -- --workers=4
```

### Run the main Chrome flow sequence

```powershell
npm run test:sequence
```

### Run tests without Node deprecation warnings

```powershell
npm run test:no-deprecation
```

### Run the main Chrome sequence without warnings

```powershell
npm run test:sequence:no-deprecation
```

### Run tests and generate an HTML report

```powershell
npm run test:html
```

## Useful Commands

- Run a specific test file:

```powershell
npx playwright test tests/login.spec.ts
```

- Run the forgot-password test file:

```powershell
npx playwright test tests/forgot-password.spec.ts
```

## Repository Structure

- `tests/` - Playwright test files
- `utils/` - helper modules for login, OTP, and Gmail interaction
- `playwright.config.ts` - Playwright configuration and project settings
- `package.json` - npm scripts and dependencies
- `test-artifacts/` - Playwright output directory for built-in failure screenshots, traces, and custom run screenshots
- `test-artifacts/screenshots/` - centralized screenshot artifacts for validation states and per-run captures

## Notes

- The repo suppresses Node deprecation warnings using `NODE_OPTIONS=--no-deprecation` in npm scripts.
- `@google-cloud/local-auth` is part of the project dependencies and may indirectly trigger deprecation warnings when not suppressed.
