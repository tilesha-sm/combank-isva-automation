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
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e7]:
      - img "Translate"
      - combobox "Language selector" [ref=e8] [cursor=pointer]:
        - option "English" [selected]
    - generic [ref=e10]:
      - heading "Banking that empowers your business" [level=2] [ref=e11]
      - paragraph [ref=e12]: Simplify corporate finance with secure, intelligent, and connected banking solutions.
      - paragraph [ref=e13]: ©2026 Commercial Bank of Ceylon PLC | All rights Reserved
  - generic [ref=e14]:
    - img "Commercial Bank Logo" [ref=e17]
    - generic [ref=e19]:
      - heading "Welcome back to" [level=1] [ref=e20]
      - heading "ComBank Business" [level=2] [ref=e21]
      - paragraph [ref=e22]: Access your corporate accounts, manage payments, and monitor transactions securely
      - generic [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e25]: Username *
          - textbox "Username *" [active] [ref=e27]:
            - /placeholder: Username
        - generic [ref=e28]:
          - generic [ref=e29]: Password *
          - generic [ref=e30]:
            - textbox "Password *" [ref=e31]:
              - /placeholder: "*************"
            - generic "Toggle password visibility" [ref=e32] [cursor=pointer]:
              - img "Toggle visibility" [ref=e33]
        - link "Forgot password ?" [ref=e35] [cursor=pointer]:
          - /url: "#"
        - button "Login" [disabled] [ref=e37]
    - generic:
      - img "Building Illustration"
```

# Test source

```ts
  1   | import { test } from '@playwright/test';
  2   | import { getOtpFromGmail } from '../src/utils/auth-gmail';
  3   | import { getLoginCredentials, DEFAULT_EMAIL_SENDER } from '../src/utils/credentials';
  4   | import { fillOtpInputs, selectOtpMethod, waitForOtpInputs } from '../src/utils/otp-utils';
  5   | import { START_URL, gotoWith502Check, is502Page, resetToStart } from '../src/utils/flow-utils';
  6   | import { setupAutoScreenshots, captureScreenAtStep } from '../src/utils/screenshot-utils';
  7   | 
  8   | 
  9   | test.setTimeout(180000);
  10  | 
  11  | test.use({
  12  |   headless: false,
  13  | });
  14  | 
  15  | test('ComBank login', async ({ page }) => {
  16  |   await setupAutoScreenshots(page);
  17  |   
  18  |   const MAX_ATTEMPTS = 3;
  19  |   let currentPage = page;
  20  | 
  21  |   for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  22  |     try {
  23  |       currentPage = await resetToStart(currentPage);
  24  |       const pageToUse = currentPage;
  25  | 
  26  |       // Login
  27  |       const loginCredentials = getLoginCredentials();
  28  |       await captureScreenAtStep(pageToUse, 'login-page-loaded');
  29  |       
  30  |       await pageToUse.locator('#username').fill(loginCredentials.username);
  31  |       await captureScreenAtStep(pageToUse, 'username-entered');
  32  |       
  33  |       await pageToUse.locator('input[type="password"]').fill(loginCredentials.password);
  34  |       await captureScreenAtStep(pageToUse, 'password-entered');
  35  |       
  36  |       await pageToUse.locator('#loginBtn').click();
  37  |       await pageToUse.waitForLoadState('load');
  38  |       await pageToUse.waitForLoadState('networkidle');
  39  |       await captureScreenAtStep(pageToUse, 'login-button-clicked');
  40  | 
  41  |       // Handle the active-session warning if it appears after login.
  42  |       const gotItBtn = pageToUse.locator('text=/Got it/i').first();
  43  |       try {
  44  |         await gotItBtn.waitFor({ state: 'visible', timeout: 15000 });
  45  |         await gotItBtn.click({ force: true });
  46  |         await captureScreenAtStep(pageToUse, 'active-session-warning-dismissed');
  47  |         console.log('Dismissed active-session warning');
  48  |       } catch {
  49  |         console.log('No active-session warning found');
  50  |       }
  51  | 
  52  |       // Wait for the OTP screen to be available.
  53  |       await pageToUse.waitForLoadState('load');
  54  |       await pageToUse.waitForLoadState('networkidle');
  55  |       await pageToUse.waitForTimeout(2000);
  56  | 
  57  |       const otpMethodSelected = await selectOtpMethod(pageToUse, 45000);
  58  |       if (!otpMethodSelected) {
> 59  |         throw new Error('OTP option not available in login flow.');
      |               ^ Error: OTP option not available in login flow.
  60  |       }
  61  |       await captureScreenAtStep(pageToUse, 'otp-method-selected');
  62  | 
  63  |       await pageToUse.waitForTimeout(2000);
  64  |       await waitForOtpInputs(pageToUse, 90000);
  65  |       await captureScreenAtStep(pageToUse, 'otp-input-screen-ready');
  66  | 
  67  |       const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
  68  |       if (!otp) {
  69  |         throw new Error('OTP not found in Gmail');
  70  |       }
  71  |       console.log('OTP received from email:', otp);
  72  |       await fillOtpInputs(pageToUse, otp);
  73  |       await captureScreenAtStep(pageToUse, 'otp-filled');
  74  |       
  75  |       await pageToUse.waitForTimeout(2000);
  76  | 
  77  |       if (await is502Page(pageToUse)) {
  78  |         throw new Error('Detected 502 Bad Gateway after OTP entry');
  79  |       }
  80  | 
  81  |       await captureScreenAtStep(pageToUse, 'login-success');
  82  | 
  83  |       // success
  84  |       return;
  85  |     } catch (err) {
  86  |       const found502 = await is502Page(currentPage).catch(() => false);
  87  |       const msg = String(err || '');
  88  |       const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
  89  |       if ((found502 || closedError) && attempt < MAX_ATTEMPTS) {
  90  |         console.log(`Detected 502/closed browser — restarting flow (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
  91  |         await captureScreenAtStep(currentPage, `error-attempt-${attempt}`);
  92  |         currentPage = await resetToStart(currentPage);
  93  |         continue;
  94  |       }
  95  |       throw err;
  96  |     }
  97  |   }
  98  | });
  99  | 
  100 | 
```