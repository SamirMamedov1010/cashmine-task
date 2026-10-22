import { Platform } from 'react-native';

const TOKEN_STORAGE_KEY = 'cashmine.apiToken';

function getBrowserStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') {
    return null;
  }

  return globalThis.localStorage;
}

export function loadStoredToken(): string | null {
  try {
    return getBrowserStorage()?.getItem(TOKEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    getBrowserStorage()?.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Private browsing and restrictive browser settings can disable storage.
  }
}

export function removeStoredToken(): void {
  try {
    getBrowserStorage()?.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // A failed removal should not prevent the in-memory session from ending.
  }
}
