# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forgot-password-negative.spec.ts >> Forgot Password negative cases >> Wrong OTP entered three times during reset eventually locks verification
- Location: tests\forgot-password-negative.spec.ts:113:7

# Error details

```
Error: OTP input fields did not appear within timeout
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
      - button "Email Icon Request OTP to email Get a verification code sent to your registered email address" [ref=e22] [cursor=pointer]:
        - img "Email Icon" [ref=e23]
        - generic [ref=e24]:
          - generic [ref=e25]: Request OTP to email
          - generic [ref=e26]: Get a verification code sent to your registered email address
      - button "Mobile Icon Request OTP to mobile Get a verification code sent to your registered mobile number" [ref=e28] [cursor=pointer]:
        - img "Mobile Icon" [ref=e29]
        - generic [ref=e30]:
          - generic [ref=e31]: Request OTP to mobile
          - generic [ref=e32]: Get a verification code sent to your registered mobile number
    - generic:
      - img "Building Illustration"
```

# Test source

```ts
  91  | 
  92  |   return false;
  93  | }
  94  | 
  95  | async function findVisibleOtpInputs(page: Page) {
  96  |   const strongSelectors = [
  97  |     '#otp1,#otp2,#otp3,#otp4,#otp5,#otp6',
  98  |     'input[autocomplete="one-time-code"],input[id*="otp"],input[name*="otp"],input[placeholder*="OTP"],input[aria-label*="OTP"],input[aria-label*="One-time Password"],input[aria-label*="verification code"],input[aria-label*="Verification code"]',
  99  |     'input[maxlength="1"][type="tel"],input[maxlength="1"][inputmode="numeric"],input[maxlength="1"][pattern="\\d*"]',
  100 |   ];
  101 |   const genericSelectors = ['input[type="tel"],input[type="text"]'];
  102 |   const loginFieldPattern = /user(name)?|email|pass(word)?|login|search|name/i;
  103 |   const otpFieldPattern = /otp|one[-\s]?time|verification|security\s?code|passcode/i;
  104 |   const otpScreenPattern = /otp|one[-\s]?time|verification\s?code|security\s?code|passcode|request otp|enter.*code/i;
  105 | 
  106 |   async function isLikelyOtpInput(locator: any) {
  107 |     const id = (await locator.getAttribute('id')) || '';
  108 |     const name = (await locator.getAttribute('name')) || '';
  109 |     const placeholder = (await locator.getAttribute('placeholder')) || '';
  110 |     const ariaLabel = (await locator.getAttribute('aria-label')) || '';
  111 |     const autocomplete = (await locator.getAttribute('autocomplete')) || '';
  112 |     const inputMode = (await locator.getAttribute('inputmode')) || '';
  113 |     const maxLength = (await locator.getAttribute('maxlength')) || '';
  114 |     const value = `${id} ${name} ${placeholder} ${ariaLabel} ${autocomplete}`;
  115 | 
  116 |     if (loginFieldPattern.test(value)) return false;
  117 |     if (otpFieldPattern.test(value)) return true;
  118 |     if (autocomplete === 'one-time-code') return true;
  119 |     if (/numeric|decimal/i.test(inputMode) && /^[1-8]$/.test(maxLength)) return true;
  120 | 
  121 |     return false;
  122 |   }
  123 | 
  124 |   async function pageHasOtpContext() {
  125 |     return page
  126 |       .locator(`text=${otpScreenPattern}`)
  127 |       .first()
  128 |       .isVisible({ timeout: 500 })
  129 |       .catch(() => false);
  130 |   }
  131 | 
  132 |   const frames = page.frames();
  133 | 
  134 |   for (const selector of strongSelectors) {
  135 |     for (const frame of frames) {
  136 |       const locator = frame.locator(selector as any);
  137 |       const count = await locator.count();
  138 |       if (count === 0) continue;
  139 | 
  140 |       const visibleLocators = [] as any[];
  141 |       for (let i = 0; i < count; i++) {
  142 |         const candidate = locator.nth(i);
  143 |         const isVisible = await candidate.isVisible().catch(() => false);
  144 |         if (!isVisible) continue;
  145 |         visibleLocators.push(candidate);
  146 |       }
  147 | 
  148 |       if (visibleLocators.length > 0) {
  149 |         return visibleLocators;
  150 |       }
  151 |     }
  152 |   }
  153 | 
  154 |   if (await pageHasOtpContext()) {
  155 |     for (const selector of genericSelectors) {
  156 |       for (const frame of frames) {
  157 |         const locator = frame.locator(selector as any);
  158 |         const count = await locator.count();
  159 |         if (count === 0) continue;
  160 | 
  161 |         const visibleLocators = [] as any[];
  162 |         for (let i = 0; i < count; i++) {
  163 |           const candidate = locator.nth(i);
  164 |           const isVisible = await candidate.isVisible().catch(() => false);
  165 |           if (!isVisible) continue;
  166 |           if (!(await isLikelyOtpInput(candidate))) continue;
  167 |           visibleLocators.push(candidate);
  168 |         }
  169 | 
  170 |         if (visibleLocators.length > 0) {
  171 |           return visibleLocators;
  172 |         }
  173 |       }
  174 |     }
  175 |   }
  176 | 
  177 |   return [] as any[];
  178 | }
  179 | 
  180 | export async function waitForOtpInputs(page: Page, timeoutMs = 90000) {
  181 |   const deadline = Date.now() + timeoutMs;
  182 | 
  183 |   while (Date.now() < deadline) {
  184 |     const inputs = await findVisibleOtpInputs(page);
  185 |     if (inputs.length > 0) {
  186 |       return inputs;
  187 |     }
  188 |     await page.waitForTimeout(500);
  189 |   }
  190 | 
> 191 |   throw new Error('OTP input fields did not appear within timeout');
      |         ^ Error: OTP input fields did not appear within timeout
  192 | }
  193 | 
  194 | export async function fillOtpInputs(page: Page, otp: string) {
  195 |   const digits = otp.trim().split('');
  196 |   const inputs = await waitForOtpInputs(page, 30000);
  197 |   
  198 |   // If multiple inputs, try to sort by numeric id suffix (otp1, otp2, ...)
  199 |   let ordered = inputs;
  200 |   try {
  201 |     const withId = await Promise.all(
  202 |       inputs.map(async (loc) => {
  203 |         const id = (await loc.getAttribute('id')) || '';
  204 |         return { id, loc };
  205 |       })
  206 |     );
  207 | 
  208 |     const numeric = withId.filter((x) => /otp\d+$/i.test(x.id));
  209 |     if (numeric.length === withId.length) {
  210 |       numeric.sort((a, b) => {
  211 |         const ai = parseInt(a.id.replace(/[^0-9]/g, ''), 10) || 0;
  212 |         const bi = parseInt(b.id.replace(/[^0-9]/g, ''), 10) || 0;
  213 |         return ai - bi;
  214 |       });
  215 |       ordered = numeric.map((x) => x.loc);
  216 |     }
  217 |   } catch (e) {
  218 |     // ignore ordering errors and keep DOM order
  219 |   }
  220 | 
  221 |   if (ordered.length === 1) {
  222 |     // Single OTP input - fill entire OTP
  223 |     await ordered[0].waitFor({ state: 'visible', timeout: 30000 });
  224 |     try {
  225 |       await ordered[0].fill(otp);
  226 |     } catch {
  227 |       // Try click first, then fill
  228 |       await ordered[0].click({ force: true });
  229 |       await ordered[0].fill(otp);
  230 |     }
  231 |     return;
  232 |   }
  233 | 
  234 |   // Multiple OTP inputs - fill them digit-by-digit. This avoids entering the whole
  235 |   // code into the first box and then re-filling the remaining fields.
  236 |   // Some pages keep only the active box enabled and unlock the next box from
  237 |   // oninput/onkeyup handlers.
  238 |   const requiredFills = Math.min(ordered.length, digits.length);
  239 | 
  240 |   for (let i = 0; i < requiredFills; i++) {
  241 |     const input = ordered[i];
  242 |     await input.waitFor({ state: 'visible', timeout: 30000 });
  243 | 
  244 |     const editableDeadline = Date.now() + 30000;
  245 |     while (!(await input.isEditable({ timeout: 1000 }).catch(() => false))) {
  246 |       if (Date.now() >= editableDeadline) {
  247 |         throw new Error(`OTP digit ${i + 1} did not become editable`);
  248 |       }
  249 |       await page.waitForTimeout(250);
  250 |     }
  251 | 
  252 |     let filled = false;
  253 | 
  254 |     // Try 1: click + type, which triggers the same keyboard handlers as a user.
  255 |     try {
  256 |       await input.click({ force: true });
  257 |       await input.type(digits[i], { delay: 50 });
  258 |       filled = true;
  259 |     } catch {
  260 |       try {
  261 |         // Try 2: clear/fill only when the field is editable.
  262 |         await input.focus();
  263 |         await input.fill(digits[i]);
  264 |         filled = true;
  265 |       } catch {
  266 |         try {
  267 |           // Try 3: direct DOM update plus input/keyup events for custom handlers.
  268 |           await input.evaluate((element: HTMLInputElement, digit: string) => {
  269 |             element.value = digit;
  270 |             element.dispatchEvent(new Event('input', { bubbles: true }));
  271 |             element.dispatchEvent(new KeyboardEvent('keyup', { key: digit, bubbles: true }));
  272 |           }, digits[i]);
  273 |           filled = true;
  274 |         } catch {
  275 |           // Continue to the explicit failure below.
  276 |         }
  277 |       }
  278 |     }
  279 | 
  280 |     if (!filled) {
  281 |       throw new Error(`Unable to fill OTP digit ${i + 1}`);
  282 |     }
  283 | 
  284 |     await page.waitForTimeout(100);
  285 |   }
  286 | }
  287 | 
```