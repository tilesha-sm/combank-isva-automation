# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forgot-password-negative.spec.ts >> Forgot Password negative cases >> Wrong OTP entered three times during reset eventually locks verification
- Location: tests\forgot-password-negative.spec.ts:87:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/locked|blocked|too many attempts|try again later|account.*locked|otp.*locked|verification.*locked/i').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=/locked|blocked|too many attempts|try again later|account.*locked|otp.*locked|verification.*locked/i').first()
    - waiting for" https://uatisvaext.combank.net/mga/sps/authsvc?TransactionId=5bd8a04a-4ef6-4f7e-8a6a-ebc1c6739bae" navigation to finish...
    - navigated to "https://uatisvaext.combank.net/mga/sps/authsvc?TransactionId=5bd8a04a-4ef6-4f7e-8a6a-ebc1c6739bae"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img "Translate"
      - combobox [ref=e5] [cursor=pointer]:
        - option "English" [selected]
    - generic [ref=e7]:
      - heading "Banking that empowers your business" [level=2] [ref=e8]
      - paragraph [ref=e9]: Simplify corporate finance with secure, intelligent, and connected banking solutions.
      - paragraph [ref=e10]: ©2026 Commercial Bank of Ceylon PLC | All rights Reserved
  - generic [ref=e11]:
    - img "Commercial Bank Logo" [ref=e14]
    - generic [ref=e15]:
      - generic [ref=e16]:
        - img "Security Authentication" [ref=e18]
        - heading "Two Factor Authentication" [level=2] [ref=e19]
        - paragraph [ref=e20]: Please select a method to receive your verification code
      - generic [ref=e22]:
        - img "Error Icon" [ref=e23]
        - generic [ref=e25]:
          - text: Your account has been temporarily locked out due to exceeding incorrect maximum attempts. Please retry login again in
          - generic [ref=e26]: 0:07
          - text: or contact +94112353353
      - button "Email Icon Request OTP to email Get a verification code sent to your registered email address" [disabled] [ref=e28]:
        - img "Email Icon" [ref=e29]
        - generic [ref=e30]:
          - generic [ref=e31]: Request OTP to email
          - generic [ref=e32]: Get a verification code sent to your registered email address
      - button "Mobile Icon Request OTP to mobile Get a verification code sent to your registered mobile number" [disabled] [ref=e34]:
        - img "Mobile Icon" [ref=e35]
        - generic [ref=e36]:
          - generic [ref=e37]: Request OTP to mobile
          - generic [ref=e38]: Get a verification code sent to your registered mobile number
    - generic:
      - img "Building Illustration"
```

# Test source

```ts
  77  |     await page.waitForLoadState('networkidle');
  78  | 
  79  |     const invalidFormatError = page.locator('text=/invalid username|special characters|please enter a valid username|please provide a valid username|username.*invalid|format.*username|username.*format/i');
  80  |     await expect(invalidFormatError.first()).toBeVisible({ timeout: 20000 });
  81  |     await expect(page.locator('#next')).toBeDisabled({ timeout: 15000 });
  82  |     await saveScreenshot(page, 'fp-invalid-format-error');
  83  | 
  84  |     await expect(fpUsername).toBeVisible();
  85  |   });
  86  | 
  87  |   test('Wrong OTP entered three times during reset eventually locks verification', async ({ page }) => {
  88  |     page = await resetFlowToStart(page);
  89  | 
  90  |     const forgotClicked = await clickForgotPassword(page, 15000);
  91  |     if (!forgotClicked) {
  92  |       throw new Error('Unable to open forgot password flow');
  93  |     }
  94  |     await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  95  |     await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  96  |     const fpUsername = page.locator('#FPUsername, input[name="FPUsername"]').first();
  97  |     await fpUsername.waitFor({ state: 'visible', timeout: 30000 });
  98  | 
  99  |     await fpUsername.fill(VALID_FORGOT_USERNAME);
  100 |     await page.locator('#next').click();
  101 |     await page.waitForLoadState('load').catch(() => {});
  102 |     await page.waitForLoadState('networkidle').catch(() => {});
  103 | 
  104 |     const activeSessionMsg = page.locator('text=/already active session|automatically logged out/i');
  105 |     const gotItBtn = page.getByRole('link', { name: /Got it/i }).or(page.locator('text=/Got it/i')).first();
  106 |     if (await gotItBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
  107 |       await Promise.all([
  108 |         page.waitForLoadState('load').catch(() => {}),
  109 |         gotItBtn.click({ force: true }),
  110 |       ]);
  111 |       await page.waitForLoadState('load').catch(() => {});
  112 |       await page.waitForLoadState('networkidle').catch(() => {});
  113 |       await page.waitForTimeout(2500);
  114 |     }
  115 | 
  116 |     if (await activeSessionMsg.first().isVisible({ timeout: 3000 }).catch(() => false)) {
  117 |       test.skip(true, 'The test account has an already-active session and cannot reach OTP verification.');
  118 |       return;
  119 |     }
  120 | 
  121 |     const otpMethodSelected = await selectOtpMethod(page, 45000);
  122 |     const otpInputsPresent = await waitForOtpInputs(page, 5000).then(() => true).catch(() => false);
  123 |     if (!otpMethodSelected && !otpInputsPresent) {
  124 |       if (await activeSessionMsg.first().isVisible({ timeout: 3000 }).catch(() => false)) {
  125 |         test.skip(true, 'The test account has an already-active session and cannot reach OTP verification.');
  126 |         return;
  127 |       }
  128 |       const sessionTimeoutMsg = page.locator('text=/session.*timeout|session has ended|login again/i');
  129 |       if (await sessionTimeoutMsg.first().isVisible({ timeout: 3000 }).catch(() => false)) {
  130 |         test.skip(true, 'The environment ended the forgot-password session before OTP verification was available.');
  131 |         return;
  132 |       }
  133 |       throw new Error('OTP method selection failed after dismissing active-session warning');
  134 |     }
  135 | 
  136 |     const otpError = page.locator('text=/invalid|incorrect|wrong otp|verification failed|authentication failed/i');
  137 |     const lockError = page.locator('text=/locked|blocked|too many attempts|try again later|account.*locked|otp.*locked|verification.*locked/i');
  138 |     const loginPrompt = page.locator('#username');
  139 |     let lockDetected = false;
  140 | 
  141 |     for (let attempt = 1; attempt <= 3; attempt += 1) {
  142 |       if (await lockError.first().isVisible({ timeout: 1000 }).catch(() => false)) {
  143 |         lockDetected = true;
  144 |         await saveScreenshot(page, 'fp-otp-locked-final');
  145 |         break;
  146 |       }
  147 | 
  148 |       if (await loginPrompt.isVisible({ timeout: 1000 }).catch(() => false)) {
  149 |         test.skip(true, 'The environment returned to the login page before OTP lock verification completed.');
  150 |         return;
  151 |       }
  152 | 
  153 |       await waitForOtpInputs(page, 15000);
  154 |       await fillOtpInputs(page, WRONG_OTP);
  155 | 
  156 |       const submitButton = page.locator('button[type="submit"],button:has-text("Submit"),button:has-text("Continue"),button:has-text("Verify")').first();
  157 |       if (await submitButton.count()) {
  158 |         await submitButton.click({ force: true });
  159 |       } else {
  160 |         await page.keyboard.press('Enter');
  161 |       }
  162 | 
  163 |       if (attempt < 3) {
  164 |         const otpErrorVisible = await otpError.first().isVisible({ timeout: 20000 }).catch(() => false);
  165 |         if (!otpErrorVisible && await loginPrompt.isVisible({ timeout: 1000 }).catch(() => false)) {
  166 |           test.skip(true, 'The environment returned to the login page after a wrong OTP attempt.');
  167 |           return;
  168 |         }
  169 |         await expect(otpError.first()).toBeVisible();
  170 |         await saveScreenshot(page, `fp-wrong-otp-attempt-${attempt}`);
  171 |       } else {
  172 |         const lockVisible = await lockError.first().isVisible({ timeout: 30000 }).catch(() => false);
  173 |         if (!lockVisible && await loginPrompt.isVisible({ timeout: 1000 }).catch(() => false)) {
  174 |           test.skip(true, 'The environment returned to the login page before showing the OTP lock state.');
  175 |           return;
  176 |         }
> 177 |         await expect(lockError.first()).toBeVisible();
      |                                         ^ Error: expect(locator).toBeVisible() failed
  178 |         lockDetected = true;
  179 |         await saveScreenshot(page, 'fp-otp-locked-final');
  180 |       }
  181 |     }
  182 | 
  183 |     if (!lockDetected) {
  184 |       throw new Error('OTP lock state was not reached after 3 failed attempts');
  185 |     }
  186 |   });
  187 | });
  188 | 
```