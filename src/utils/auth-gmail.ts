import path from "path";
import fs from "fs";
import { authenticate } from "@google-cloud/local-auth";
import { google, Auth } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = path.join(process.cwd(), "config", "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "config", "credentials.json");

/** ---------------- OTP DECODE ---------------- */
function decodeBase64Url(value: string): string {
  if (!value || typeof value !== "string") return "";
  // Convert from base64url to base64
  let s = value.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if missing
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad === 1) {
    // invalid base64 length; attempt to clean by removing non-base64 chars
    s = s.slice(0, s.length - 1);
  }
  try {
    return Buffer.from(s, "base64").toString("utf8");
  } catch (e) {
    return "";
  }
}

/** ---------------- OTP EXTRACTION ---------------- */
function extractOtp(text: string): string | null {
  if (!text) return null;
  // Look for contextual OTP phrases (covers variations like "one-time", "one time")
  const contextMatch = text.match(
    /(?:otp|one[-\s]?time|pass\s?-?code|passcode|verification\s?code|your\s?code|code)[^\d]{0,30}(\d{4,8})/i
  );
  if (contextMatch) return contextMatch[1];

  // Fallback: any 4-8 digit group
  const matches = text.match(/\b\d{4,8}\b/g) || [];
  return matches[0] ?? null;
}

/** ---------------- REFERENCE EXTRACTION ---------------- */
function extractReference(text: string): string | null {
  if (!text) return null;
  // match common reference forms: Reference, Ref, Ref., Reference No, Ref No
  const refMatch = text.match(/(?:reference|ref(?:\.|(?:erence)?)|reference\s+no\.?|ref\s+no\.?)\s*[:#\-\s]*?(\d{3,})/i);
  if (refMatch) return refMatch[1];
  return null;
}

/** ---------------- TOKEN HANDLING ---------------- */
async function loadSavedToken(): Promise<Auth.OAuth2Client | null> {
  try {
    const token = fs.readFileSync(TOKEN_PATH, "utf8");
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

    const { client_id, client_secret } =
      credentials.installed || credentials.web;

    const client = new google.auth.OAuth2(client_id, client_secret);
    client.setCredentials(JSON.parse(token));

    return client;
  } catch {
    return null;
  }
}

async function saveToken(client: Auth.OAuth2Client): Promise<void> {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(client.credentials));
}

/** ---------------- AUTH FLOW ---------------- */
async function authorize(): Promise<Auth.OAuth2Client> {
  const saved = await loadSavedToken();
  if (saved) {
    try {
      const tokenResponse = await (saved as any).getAccessToken();
      if (!tokenResponse || !tokenResponse.token) {
        throw new Error("Saved token did not return a valid access token.");
      }
      return saved;
    } catch {
      try {
        fs.unlinkSync(TOKEN_PATH);
      } catch {
        // ignore if deletion fails
      }
    }
  }

  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) {
    await saveToken(client as unknown as Auth.OAuth2Client);
  }

  try {
    await (client as any).getAccessToken();
  } catch {
    // ignore verification failures after authentication
  }

  return client as unknown as Auth.OAuth2Client;
}

/** ---------------- BODY EXTRACTION ---------------- */
function extractBodyText(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    return payload.parts.map(extractBodyText).join("\n");
  }

  return "";
}

function isAuthError(error: any): boolean {
  if (!error) return false;
  const status = error?.response?.status || error?.code;
  const message = String(error?.message || error?.response?.data?.error?.message || error?.response?.data?.error_description || "");
  return (
    status === 401 ||
    /Login Required|unauthorized_client|invalid_grant/i.test(message)
  );
}

/** ---------------- MAIN OTP FUNCTION ---------------- */
export async function getOtpFromGmail(
  senderFilter = "SecurityVerification@combank.net",
  expectedReference: string | null = null,
  maxResults = 10,
  timeoutMs = 30000
): Promise<string | null> {
  let auth = await authorize();
  let gmail = google.gmail({ version: "v1", auth });

  const deadline = Date.now() + timeoutMs;

  async function reauthorize() {
    try {
      fs.unlinkSync(TOKEN_PATH);
    } catch {
      // ignore if deletion fails
    }
    auth = await authorize();
    gmail = google.gmail({ version: "v1", auth });
  }

  while (Date.now() < deadline) {
    let list;
    try {
      list = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: senderFilter
          ? `from:${senderFilter} newer_than:1h`
          : `newer_than:1h`,
      });
    } catch (error: any) {
      if (isAuthError(error)) {
        await reauthorize();
        continue;
      }
      throw error;
    }

    const messages = list.data.messages || [];

    for (const msg of messages) {
      let full;
      try {
        full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });
      } catch (error: any) {
        if (isAuthError(error)) {
          await reauthorize();
          continue;
        }
        throw error;
      }

      const headers = full.data.payload?.headers || [];
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "";

      const body = extractBodyText(full.data.payload);
      const combined = `${subject}\n${body}`;
      const otp = extractOtp(combined);

      if (otp) {
        if (expectedReference) {
          const ref = extractReference(combined);
          if (ref && String(ref) === String(expectedReference)) {
            return otp;
          }
          continue;
        }

        return otp;
      }
    }

    await new Promise((r) => setTimeout(r, 5000));
  }

  return null;
}

// Entry point removed — use `test-gmail.ts` or call `getOtpFromGmail` from tests.