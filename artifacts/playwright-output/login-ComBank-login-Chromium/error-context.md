# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> ComBank login
- Location: tests\login.spec.ts:15:5

# Error details

```
Error: OTP option not available in login flow.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: uatisvaext.combank.net
      - text: took too long to respond.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
        - listitem [ref=e16]:
          - link "Running Windows Network Diagnostics" [ref=e17] [cursor=pointer]:
            - /url: javascript:diagnoseErrors()
    - generic [ref=e18]: ERR_CONNECTION_TIMED_OUT
  - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1  | import { test } from '@playwright/test';
  2  | import { getOtpFromGmail } from '../src/utils/auth-gmail';
  3  | import { getLoginCredentials, DEFAULT_EMAIL_SENDER } from '../src/utils/credentials';
  4  | import { fillOtpInputs, selectOtpMethod, waitForOtpInputs } from '../src/utils/otp-utils';
  5  | import { START_URL, gotoWith502Check, is502Page, resetToStart } from '../src/utils/flow-utils';
  6  | import { saveScreenshot } from '../src/utils/screenshot-utils';
  7  | 
  8  | 
  9  | test.setTimeout(180000);
  10 | 
  11 | test.use({
  12 |   headless: false,
  13 | });
  14 | 
  15 | test('ComBank login', async ({ page }) => {
  16 |   // No auto screenshots; capture a single final-success screenshot on success.
  17 |   
  18 |   const MAX_ATTEMPTS = 3;
  19 |   let currentPage = page;
  20 | 
  21 |   for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  22 |     try {
  23 |       currentPage = await resetToStart(currentPage);
  24 |       const pageToUse = currentPage;
  25 | 
  26 |       // Login
  27 |       const loginCredentials = getLoginCredentials();
  28 |       
  29 |       await pageToUse.locator('#username').fill(loginCredentials.username);
  30 |       await pageToUse.locator('input[type="password"]').fill(loginCredentials.password);
  31 |       await pageToUse.locator('#loginBtn').click();
  32 |       await pageToUse.waitForLoadState('load');
  33 |       await pageToUse.waitForLoadState('networkidle');
  34 |       
  35 | 
  36 |       // Handle the active-session warning if it appears after login.
  37 |       const gotItBtn = pageToUse.locator('text=/Got it/i').first();
  38 |       try {
  39 |         await gotItBtn.waitFor({ state: 'visible', timeout: 15000 });
  40 |         await gotItBtn.click({ force: true });
  41 |         console.log('Dismissed active-session warning');
  42 |       } catch {
  43 |         console.log('No active-session warning found');
  44 |       }
  45 | 
  46 |       // Wait for the OTP screen to be available.
  47 |       await pageToUse.waitForLoadState('load');
  48 |       await pageToUse.waitForLoadState('networkidle');
  49 |       await pageToUse.waitForTimeout(2000);
  50 | 
  51 |       const otpMethodSelected = await selectOtpMethod(pageToUse, 45000);
  52 |       if (!otpMethodSelected) {
> 53 |         throw new Error('OTP option not available in login flow.');
     |               ^ Error: OTP option not available in login flow.
  54 |       }
  55 |       
  56 | 
  57 |       await pageToUse.waitForTimeout(2000);
  58 |       await waitForOtpInputs(pageToUse, 90000);
  59 |       
  60 | 
  61 |       const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
  62 |       if (!otp) {
  63 |         throw new Error('OTP not found in Gmail');
  64 |       }
  65 |       console.log('OTP received from email:', otp);
  66 |       await fillOtpInputs(pageToUse, otp);
  67 |       
  68 |       await pageToUse.waitForTimeout(2000);
  69 | 
  70 |       if (await is502Page(pageToUse)) {
  71 |         throw new Error('Detected 502 Bad Gateway after OTP entry');
  72 |       }
  73 | 
  74 |       // success — single final screenshot
  75 |       await saveScreenshot(pageToUse, 'login_final-success', 'login');
  76 |       return;
  77 |     } catch (err) {
  78 |       const found502 = await is502Page(currentPage).catch(() => false);
  79 |       const msg = String(err || '');
  80 |       const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
  81 |         if ((found502 || closedError) && attempt < MAX_ATTEMPTS) {
  82 |         console.log(`Detected 502/closed browser — restarting flow (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
  83 |         currentPage = await resetToStart(currentPage);
  84 |         continue;
  85 |       }
  86 |       throw err;
  87 |     }
  88 |   }
  89 | });
  90 | 
  91 | 
```