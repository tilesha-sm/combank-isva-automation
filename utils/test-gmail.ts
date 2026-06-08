import { getOtpFromGmail } from './auth-gmail';

// quick startup marker so we can see the script executed
console.log('SCRIPT START — utils/test-gmail.ts');

(async () => {
  try {
    console.log('Testing Gmail connection...');

    const otp = await getOtpFromGmail(
      'SecurityVerification@combank.net',
      null,
      10,
      30000
    );

    if (otp) {
      console.log('✅ SUCCESS — OTP found:', otp);
      process.exit(0);
    } else {
      console.log('❌ No OTP found. Check sender filter or trigger a new OTP.');
      process.exit(2);
    }
  } catch (err) {
    console.error('ERROR running test-gmail.ts:', err);
    process.exit(1);
  }
})();