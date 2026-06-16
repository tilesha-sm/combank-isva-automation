# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-negative.spec.ts >> Login negative cases >> Wrong OTP entered on the OTP screen shows authentication error
- Location: tests\login-negative.spec.ts:76:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/invalid|incorrect|wrong otp|authentication failed|verification failed/i').first()
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for locator('text=/invalid|incorrect|wrong otp|authentication failed|verification failed/i').first()

```

```yaml
- img "Translate"
- combobox:
  - option "English" [selected]
- heading "Banking that empowers your business" [level=2]
- paragraph: Simplify corporate finance with secure, intelligent, and connected banking solutions.
- paragraph: ©2026 Commercial Bank of Ceylon PLC | All rights Reserved
- img "Commercial Bank Logo"
- img "Security Authentication"
- heading "Two Factor Authentication" [level=2]
- paragraph: Please select a method to receive your verification code
- button "Email Icon Request OTP to email Get a verification code sent to your registered email address":
  - img "Email Icon"
  - text: Request OTP to email Get a verification code sent to your registered email address
- button "Mobile Icon Request OTP to mobile Get a verification code sent to your registered mobile number":
  - img "Mobile Icon"
  - text: Request OTP to mobile Get a verification code sent to your registered mobile number
- img "Building Illustration"
```

# Test source

```ts
  22  |     await setupAutoScreenshots(page);
  23  |     
  24  |     page = await resetFlowToStart(page);
  25  |     await captureScreenAtStep(page, 'login-page-opened');
  26  | 
  27  |     await page.locator(USERNAME_FIELD).fill('');
  28  |     await page.locator(PASSWORD_FIELD).fill('');
  29  |     await captureScreenAtStep(page, 'empty-credentials');
  30  | 
  31  |     await expect(page.locator(LOGIN_BUTTON)).toBeDisabled();
  32  |     await captureScreenAtStep(page, 'login-button-disabled');
  33  |     
  34  |     await expect(page.locator(USERNAME_FIELD)).toBeVisible();
  35  |     await captureScreenAtStep(page, 'test-passed');
  36  |   });
  37  | 
  38  |   test('Valid username with wrong password shows login error', async ({ page }) => {
  39  |     await setupAutoScreenshots(page);
  40  |     
  41  |     page = await resetFlowToStart(page);
  42  |     await captureScreenAtStep(page, 'login-page-opened');
  43  | 
  44  |     await page.locator(USERNAME_FIELD).fill(VALID_USERNAME);
  45  |     await page.locator(PASSWORD_FIELD).fill(WRONG_PASSWORD);
  46  |     await captureScreenAtStep(page, 'wrong-password-entered');
  47  |     
  48  |     await page.locator(LOGIN_BUTTON).click();
  49  |     await captureScreenAtStep(page, 'login-attempted');
  50  | 
  51  |     const loginError = page.locator('text=/invalid|incorrect|wrong|failed/i');
  52  |     await expect(loginError.first()).toBeVisible({ timeout: 15000 });
  53  |     await captureScreenAtStep(page, 'error-message-displayed');
  54  |     
  55  |     await expect(page.locator(USERNAME_FIELD)).toBeVisible();
  56  |     await captureScreenAtStep(page, 'test-passed');
  57  |   });
  58  | 
  59  |   test('Blank username with valid password keeps login disabled', async ({ page }) => {
  60  |     await setupAutoScreenshots(page);
  61  |     
  62  |     page = await resetFlowToStart(page);
  63  |     await captureScreenAtStep(page, 'login-page-opened');
  64  | 
  65  |     await page.locator(USERNAME_FIELD).fill('');
  66  |     await page.locator(PASSWORD_FIELD).fill(VALID_PASSWORD);
  67  |     await captureScreenAtStep(page, 'blank-username-with-password');
  68  | 
  69  |     await expect(page.locator(LOGIN_BUTTON)).toBeDisabled();
  70  |     await captureScreenAtStep(page, 'login-button-disabled');
  71  |     
  72  |     await expect(page.locator(USERNAME_FIELD)).toBeVisible();
  73  |     await captureScreenAtStep(page, 'test-passed');
  74  |   });
  75  | 
  76  |   test('Wrong OTP entered on the OTP screen shows authentication error', async ({ page }) => {
  77  |     await setupAutoScreenshots(page);
  78  |     
  79  |     page = await resetFlowToStart(page);
  80  |     await captureScreenAtStep(page, 'login-page-opened');
  81  | 
  82  |     await page.locator(USERNAME_FIELD).fill(VALID_USERNAME);
  83  |     await page.locator(PASSWORD_FIELD).fill(VALID_PASSWORD);
  84  |     await captureScreenAtStep(page, 'credentials-entered');
  85  |     
  86  |     await page.locator(LOGIN_BUTTON).click();
  87  |     await captureScreenAtStep(page, 'login-button-clicked');
  88  | 
  89  |     await page.waitForLoadState('load');
  90  |     await page.waitForLoadState('networkidle');
  91  |     await captureScreenAtStep(page, 'after-login-wait');
  92  | 
  93  |     const gotItBtn = page.locator('text=/Got it/i').first();
  94  |     if (await gotItBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
  95  |       await gotItBtn.click({ force: true });
  96  |       await page.waitForLoadState('load').catch(() => {});
  97  |       await page.waitForLoadState('networkidle').catch(() => {});
  98  |       await page.waitForTimeout(2000);
  99  |       await captureScreenAtStep(page, 'dialog-dismissed');
  100 |     }
  101 | 
  102 |     const otpMethodSelected = await selectOtpMethod(page, 45000);
  103 |     const otpInputsPresent = await waitForOtpInputs(page, 5000).then(() => true).catch(() => false);
  104 |     if (!otpMethodSelected && !otpInputsPresent) {
  105 |       throw new Error('OTP method selection failed in login negative flow');
  106 |     }
  107 |     await captureScreenAtStep(page, 'otp-method-selected');
  108 | 
  109 |     await waitForOtpInputs(page, 45000);
  110 |     await fillOtpInputs(page, WRONG_OTP);
  111 |     await captureScreenAtStep(page, 'wrong-otp-entered');
  112 | 
  113 |     const submitButton = page.locator('button[type="submit"],button:has-text("Submit"),button:has-text("Continue"),button:has-text("Verify")').first();
  114 |     if (await submitButton.count()) {
  115 |       await submitButton.click({ force: true });
  116 |     } else {
  117 |       await page.keyboard.press('Enter');
  118 |     }
  119 |     await captureScreenAtStep(page, 'otp-submitted');
  120 | 
  121 |     const otpError = page.locator('text=/invalid|incorrect|wrong otp|authentication failed|verification failed/i');
> 122 |     await expect(otpError.first()).toBeVisible({ timeout: 30000 });
      |                                    ^ Error: expect(locator).toBeVisible() failed
  123 |     await captureScreenAtStep(page, 'otp-error-displayed');
  124 |   });
  125 | });
  126 | 
```