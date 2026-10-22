export interface BalanceItem {
  asset: string;
  decimals: number;
  available: string;
  pending: string;
  claiming: string;
  usdPrice: string;
}

export interface BalancesResponse {
  asOf: string;
  items: BalanceItem[];
}

export interface ClaimDestination {
  id: string;
  label: string;
}

export interface ClaimOptionsResponse {
  asset: string;
  minAmount: string;
  fee: string;
  destinations: ClaimDestination[];
}

export interface CreateClaimRequest {
  asset: string;
  amount: string;
  destinationId: string;
}

export interface CreateClaimResponse {
  id: string;
}

export type ClaimStatus = 'pending' | 'completed' | 'failed';

export interface ClaimStatusResponse {
  status: ClaimStatus;
  failureReason?: string;
}

export type CashMineErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'IDEMPOTENCY_MISMATCH'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'TIMEOUT';

export interface CashMineErrorBody {
  code?: CashMineErrorCode;
  message?: string;
  retryAfterMs?: number;
}
