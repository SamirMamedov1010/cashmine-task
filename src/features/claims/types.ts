import type { CreateClaimRequest } from '../../types/api';

export type ClaimAttemptPhase =
  | 'submitting'
  | 'unknown'
  | 'retryable'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'blocked';

export interface ClaimAttempt {
  version: 1;
  idempotencyKey: string;
  body: CreateClaimRequest;
  phase: ClaimAttemptPhase;
  createdAt: string;
  claimId?: string;
  failureReason?: string;
  message?: string;
  retryAfterUntil?: number;
}
