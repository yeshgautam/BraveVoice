// The therapist-facing sync pipeline never sends a child's real name — only a stable,
// anonymous student code in the "AB123" format (2 letters + 3 digits) that the backend
// validates against. This module generates one once per device and persists it locally,
// alongside the class code and API auth token, the RN/Expo equivalent of the spec's
// `UserDefaults.standard.string(forKey:)` lookups.

import { getIdentityValue, setIdentityValue } from '@/lib/session-sync/database';

const STUDENT_CODE_KEY = 'studentCode';
const CLASS_CODE_KEY = 'classCode';
const AUTH_TOKEN_KEY = 'authToken';
const USERNAME_KEY = 'username';

function randomLetterPair(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  return `${a}${b}`;
}

function randomDigits(): string {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

/** Returns this device's student code, generating and persisting one on first use. */
export function getOrCreateStudentCode(): string {
  const existing = getIdentityValue(STUDENT_CODE_KEY);
  if (existing) return existing;

  const code = `${randomLetterPair()}${randomDigits()}`;
  setIdentityValue(STUDENT_CODE_KEY, code);
  return code;
}

export function getClassCode(): string {
  return getIdentityValue(CLASS_CODE_KEY) ?? '';
}

export function setClassCode(classCode: string): void {
  setIdentityValue(CLASS_CODE_KEY, classCode);
}

export function getAuthToken(): string {
  return getIdentityValue(AUTH_TOKEN_KEY) ?? '';
}

export function setAuthToken(token: string): void {
  setIdentityValue(AUTH_TOKEN_KEY, token);
}

/** Chosen in place of a real name — the only "who is this" label used anywhere in the app. */
export function getUsername(): string {
  return getIdentityValue(USERNAME_KEY) ?? '';
}

export function setUsername(username: string): void {
  setIdentityValue(USERNAME_KEY, username);
}
