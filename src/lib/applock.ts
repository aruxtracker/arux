/**
 * Local app lock (PIN + optional biometric unlock via WebAuthn platform authenticator).
 * The PIN is never stored — only a salted SHA-256 hash kept on this device.
 */

export interface AppLockConfig {
  salt: string;
  hash: string;
  biometricId?: string; // base64url credential id
}

const KEY = 'arux.applock';
const UNLOCKED_KEY = 'arux.applock.unlocked';
/** Re-lock after this long in the background. */
export const RELOCK_AFTER_MS = 60_000;

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function b64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str: string) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

export function getLockConfig(): AppLockConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppLockConfig) : null;
  } catch {
    return null;
  }
}

export function isLockEnabled() {
  return !!getLockConfig();
}

export async function setPin(pin: string) {
  const salt = b64url(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await hashPin(pin, salt);
  const existing = getLockConfig();
  localStorage.setItem(KEY, JSON.stringify({ salt, hash, biometricId: existing?.biometricId }));
}

export async function verifyPin(pin: string) {
  const cfg = getLockConfig();
  if (!cfg) return false;
  return (await hashPin(pin, cfg.salt)) === cfg.hash;
}

export function disableLock() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export function markUnlocked() {
  sessionStorage.setItem(UNLOCKED_KEY, String(Date.now()));
}

export function markBackgrounded() {
  const t = sessionStorage.getItem(UNLOCKED_KEY);
  if (t) sessionStorage.setItem(UNLOCKED_KEY, String(Date.now()));
}

export function isUnlocked() {
  const t = Number(sessionStorage.getItem(UNLOCKED_KEY) || 0);
  return !!t && Date.now() - t < 12 * 60 * 60 * 1000;
}

export function clearUnlocked() {
  sessionStorage.removeItem(UNLOCKED_KEY);
}

/* ---------------- Biometric (WebAuthn) ---------------- */

export function biometricSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

export function biometricEnabled() {
  return !!getLockConfig()?.biometricId;
}

export async function enrollBiometric(label: string) {
  const cfg = getLockConfig();
  if (!cfg || !biometricSupported()) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'ARUX Tracker', id: window.location.hostname },
      user: { id: userId, name: label || 'arux-user', displayName: label || 'ARUX user' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  localStorage.setItem(KEY, JSON.stringify({ ...cfg, biometricId: b64url(cred.rawId) }));
  return true;
}

export function removeBiometric() {
  const cfg = getLockConfig();
  if (!cfg) return;
  localStorage.setItem(KEY, JSON.stringify({ salt: cfg.salt, hash: cfg.hash }));
}

export async function unlockWithBiometric() {
  const cfg = getLockConfig();
  if (!cfg?.biometricId || !biometricSupported()) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: fromB64url(cfg.biometricId) }],
      userVerification: 'required',
      timeout: 60_000,
    },
  });
  return !!assertion;
}
