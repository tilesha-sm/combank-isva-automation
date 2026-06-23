# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forgot-password.spec.ts >> Forgot Password flow
- Location: tests\forgot-password.spec.ts:11:5

# Error details

```
Error: OTP option not available in forgot-password flow.
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
  1   | import { expect, test } from './hooks';
  2   | import { getForgotPasswordCredential, DEFAULT_EMAIL_SENDER } from '../src/utils/credentials';
  3   | import { getOtpFromGmail } from '../src/utils/auth-gmail';
  4   | import { fillOtpInputs, selectOtpMethod, waitForAndClick, waitForOtpInputs } from '../src/utils/otp-utils';
  5   | import { START_URL, gotoWith502Check, is502Page, resetToStart } from '../src/utils/flow-utils';
  6   | import { saveScreenshot } from '../src/utils/screenshot-utils';
  7   | 
  8   | 
  9   | test.setTimeout(180000);
  10  | 
  11  | test('Forgot Password flow', async ({ page }) => {
  12  |   
  13  |   const MAX_ATTEMPTS = 3;
  14  |   let currentPage = page;
  15  | 
  16  |   for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  17  |     try {
  18  |       currentPage = await resetToStart(currentPage);
  19  |       const pageToUse = currentPage;
  20  | 
  21  |       // detect early 502
  22  |       if (await is502Page(pageToUse)) throw new Error('Detected 502 Bad Gateway');
  23  | 
  24  |       
  25  | 
  26  |       // Forgot password
  27  |       const forgotClicked =
  28  |         (await waitForAndClick(pageToUse, '#home_forgot_Password', 'Forgot password link', 15000)) ||
  29  |         (await waitForAndClick(pageToUse, 'text=/Forgot password/i', 'Forgot password link', 15000));
  30  |       if (!forgotClicked) {
  31  |         throw new Error('Unable to open forgot password flow');
  32  |       }
  33  |       await pageToUse.waitForLoadState('domcontentloaded');
  34  |       await pageToUse.waitForLoadState('networkidle');
  35  |       
  36  | 
  37  |       // Wait for the forgot-password form to actually load.
  38  |       const fpUsername = pageToUse.locator('#FPUsername, input[name="FPUsername"]');
  39  |       await fpUsername.first().waitFor({ state: 'visible', timeout: 30000 });
  40  | 
  41  |       // Username
  42  |       const forgotCredentials = getForgotPasswordCredential();
  43  |       await fpUsername.first().fill(forgotCredentials.username);
  44  | 
  45  |       // Next
  46  |       await pageToUse.locator('#next').click();
  47  |       await pageToUse.waitForLoadState('load');
  48  |       await pageToUse.waitForLoadState('networkidle');
  49  | 
  50  |       // Some sessions return an interstitial page before the OTP methods appear.
  51  |       const gotItBtn = pageToUse.locator('text=Got it');
  52  |       try {
  53  |         await gotItBtn.waitFor({ state: 'visible', timeout: 10000 });
  54  |         await gotItBtn.click({ force: true });
  55  |         console.log('Dismissed active-session warning');
  56  |       } catch {
  57  |         console.log('No active-session warning found');
  58  |       }
  59  | 
  60  |       // Wait for the OTP/verification screen to become available.
  61  |       await pageToUse.waitForLoadState('load');
  62  |       await pageToUse.waitForLoadState('networkidle');
  63  |       await pageToUse.waitForTimeout(3000);
  64  |       await pageToUse.waitForTimeout(1500);
  65  | 
  66  |       if (await is502Page(pageToUse)) throw new Error('Detected 502 Bad Gateway');
  67  | 
  68  |       const lockoutMsg = pageToUse.locator('text=/temporarily locked out/i');
  69  |       if (await lockoutMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
  70  |         test.skip(true, 'The test account is temporarily locked out on this environment.');
  71  |         return;
  72  |       }
  73  | 
  74  |       const sessionTimeoutMsg = pageToUse.locator('text=/session.*timeout|Your session has ended|login again to continue/i');
  75  |       if (await sessionTimeoutMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
  76  |         throw new Error('Session timed out on forgot-password flow before OTP selection.');
  77  |       }
  78  | 
  79  |       const otpMethodSelected = await selectOtpMethod(pageToUse, 45000);
  80  |       if (!otpMethodSelected) {
> 81  |         throw new Error('OTP option not available in forgot-password flow.');
      |               ^ Error: OTP option not available in forgot-password flow.
  82  |       }
  83  |       await waitForOtpInputs(pageToUse, 90000);
  84  | 
  85  |       const otp = await getOtpFromGmail(DEFAULT_EMAIL_SENDER, null, 10, 30000);
  86  |       if (!otp) {
  87  |         throw new Error('OTP not found in Gmail for forgot-password flow');
  88  |       }
  89  | 
  90  |       console.log('OTP received from email:', otp);
  91  |       await fillOtpInputs(pageToUse, otp);
  92  | 
  93  |       if (await is502Page(pageToUse)) {
  94  |         throw new Error('Detected 502 Bad Gateway after OTP entry');
  95  |       }
  96  | 
  97  |       await saveScreenshot(pageToUse, 'forgot-password_final-success', 'forgot-password');
  98  |       return;
  99  |     } catch (err) {
  100 |       const found502 = await is502Page(currentPage).catch(() => false);
  101 |       const msg = String(err || '');
  102 |       const closedError = /closed/i.test(msg) || /Target page, context or browser has been closed/i.test(msg);
  103 |       const sessionTimeoutError = /session.*timeout|session has ended|login again/i.test(msg);
  104 |       if ((found502 || closedError || sessionTimeoutError) && attempt < MAX_ATTEMPTS) {
  105 |         console.log(`Detected 502/closed/browser timeout — restarting flow (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
  106 |         currentPage = await resetToStart(currentPage);
  107 |         continue;
  108 |       }
  109 |       throw err;
  110 |     }
  111 |   }
  112 | });
  113 | 
```