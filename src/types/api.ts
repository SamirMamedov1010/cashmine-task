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
