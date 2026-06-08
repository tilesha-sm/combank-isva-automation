import path from 'path';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function extractOtp(text: string) {
  const matches = text.match(/\b\d{4,8}\b/g) || [];
  return matches.find((m) => m.length >= 4) || null;
}

async function authorize() {
  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: path.join(process.cwd(), 'credentials.json'),
  });

  const gmail = google.gmail({
    version: 'v1',
    auth: auth as any,
  });

  const profile = await gmail.users.getProfile({ userId: 'me' });
  console.log('Connected Gmail:', profile.data.emailAddress);

  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 5,
    q: 'in:inbox newer_than:1d',
  });

  const messages = list.data.messages || [];

  if (messages.length === 0) {
    console.log('No recent Gmail messages found.');
    return;
  }

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'full',
    });

    const headers = full.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || 'No subject';
    const bodyParts = full.data.payload?.parts || [];
    const body = bodyParts
      .map((part) => (part.body?.data ? decodeBase64Url(part.body.data) : ''))
      .join('\n');

    const otp = extractOtp(`${subject}\n${body}`);
    if (otp) {
      console.log(`Subject: ${subject}`);
      console.log(`OTP: ${otp}`);
      return;
    }
  }

  console.log('No OTP code found in the latest Gmail messages.');
}

authorize().catch(console.error);