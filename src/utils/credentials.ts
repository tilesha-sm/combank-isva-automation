export type LoginCredential = {
  username: string;
  password: string;
};

export type ForgotPasswordCredential = {
  username: string;
};

export type ForcePasswordCredential = {
  username: string;
  password: string;
  newPassword: string;
};

export type ForceUsernameCredential = {
  username: string;
  password: string;
  newUsername: string;
};

export const LOGIN_CREDENTIALS: LoginCredential[] = [
  { username: 'Tilesha04', password: 'Combank@123' },
  
];

export const FORGOT_PASSWORD_CREDENTIALS: ForgotPasswordCredential[] = [
  { username: 'pasanqa1' },
  
];

export const FORCE_PASSWORD_CREDENTIALS: ForcePasswordCredential = {
  username: 'Tilesha01',
  password: 'Combank@123',
  newPassword: 'Combank@456',
};

export const FORCE_USERNAME_CREDENTIALS: ForceUsernameCredential = {
  username: 'Tilesha01',
  password: 'Combank@123',
  newUsername: 'tilesha01new',
};

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
