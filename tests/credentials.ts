export type LoginCredential = {
  username: string;
  password: string;
};

export type ForgotPasswordCredential = {
  username: string;
};

export const LOGIN_CREDENTIALS: LoginCredential[] = [
  { username: 'pasanqa1', password: 'Combank@123' },
  
];

export const FORGOT_PASSWORD_CREDENTIALS: ForgotPasswordCredential[] = [
  { username: 'pasanqa1' },
  
];

function chooseRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getLoginCredentials(preferredUsername?: string): LoginCredential {
  const username = preferredUsername || process.env.TEST_LOGIN_USER;
  if (username) {
    const matched = LOGIN_CREDENTIALS.find((item) => item.username === username);
    if (matched) {
      return matched;
    }
  }
  return chooseRandom(LOGIN_CREDENTIALS);
}

export function getForgotPasswordCredential(preferredUsername?: string): ForgotPasswordCredential {
  const username = preferredUsername || process.env.TEST_FORGOT_PASSWORD_USER;
  if (username) {
    const matched = FORGOT_PASSWORD_CREDENTIALS.find((item) => item.username === username);
    if (matched) {
      return matched;
    }
  }
  return chooseRandom(FORGOT_PASSWORD_CREDENTIALS);
}

export const DEFAULT_EMAIL_SENDER = 'SecurityVerification@combank.net';
