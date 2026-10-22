import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { CreateClaimRequest } from '../../types/api';
import type { ClaimAttempt, ClaimAttemptPhase } from './types';

const STORAGE_PREFIX = 'cashmine.claimAttempt.v1';
const PHASES: ClaimAttemptPhase[] = [
  'submitting',
  'unknown',
  'retryable',
  'pending',
  'completed',
  'failed',
  'blocked',
];

function isRequestBody(value: unknown): value is CreateClaimRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const body = value as Record<string, unknown>;
  return (
    typeof body.asset === 'string' &&
    typeof body.amount === 'string' &&
    typeof body.destinationId === 'string'
  );
}

function isClaimAttempt(value: unknown): value is ClaimAttempt {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const attempt = value as Record<string, unknown>;
  return (
    attempt.version === 1 &&
    typeof attempt.idempotencyKey === 'string' &&
    attempt.idempotencyKey.length > 0 &&
    typeof attempt.createdAt === 'string' &&
    typeof attempt.phase === 'string' &&
    PHASES.includes(attempt.phase as ClaimAttemptPhase) &&
    isRequestBody(attempt.body) &&
    (attempt.claimId === undefined || typeof attempt.claimId === 'string') &&
    (attempt.failureReason === undefined || typeof attempt.failureReason === 'string') &&
    (attempt.message === undefined || typeof attempt.message === 'string') &&
    (attempt.retryAfterUntil === undefined || typeof attempt.retryAfterUntil === 'number')
  );
}

function storageKey(scope: string) {
  return `${STORAGE_PREFIX}.${scope}`;
}

export async function getTokenScope(token: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    token,
  );
}

export async function loadClaimAttempt(scope: string): Promise<ClaimAttempt | null> {
  const serialized = await AsyncStorage.getItem(storageKey(scope));
  if (!serialized) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isClaimAttempt(parsed)) {
      throw new Error('Invalid saved claim recovery data.');
    }
    return parsed;
  } catch {
    throw new Error('Saved claim recovery data could not be read.');
  }
}

export async function saveClaimAttempt(
  scope: string,
  attempt: ClaimAttempt,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(scope), JSON.stringify(attempt));
}

export async function deleteClaimAttempt(scope: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(scope));
}
