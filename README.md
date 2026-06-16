# ComBank ISVA Automation

Playwright end-to-end tests for ComBank ISVA login and forgot-password OTP flows.

## Prerequisites

- Node.js installed
- Chrome installed
- Windows PowerShell for npm scripts

## Install Dependencies

```powershell
npm install
```

## Run Tests

### Run the full suite

```powershell
npx playwright test
```

### Run the Chrome project only

```powershell
npx playwright test --project=Chrome --workers=1
```

### Run tests without Node deprecation warnings

```powershell
npm run test:no-deprecation
```

### Run the Chrome sequence

```powershell
npm run test:sequence
```

### Run tests and open the HTML report

```powershell
npm run test:report
```

## Useful Commands

- Run a single test file:

```powershell
npx playwright test tests/login.spec.ts
```

- Run forgot-password tests:

```powershell
npx playwright test tests/forgot-password.spec.ts
```

## Project structure

- `tests/` - Playwright test files
- `src/utils/` - helper utilities for OTP, Gmail, and flows
- `playwright.config.ts` - Playwright settings
- `package.json` - npm scripts and dependencies
- `artifacts/` - generated test artifacts and reports
