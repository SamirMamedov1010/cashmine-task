import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import type { CashMineErrorBody } from '../types/api';

export interface ApiErrorInfo {
  status: number | string;
  code?: CashMineErrorBody['code'];
  message: string;
  retryAfterMs?: number;
}

function isErrorBody(value: unknown): value is CashMineErrorBody {
  return typeof value === 'object' && value !== null;
}

export function getApiError(error: unknown): ApiErrorInfo {
  const fallback: ApiErrorInfo = {
    status: 'UNKNOWN',
    message: 'We could not reach CashMine. Check your connection and try again.',
  };

  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return fallback;
  }

  const queryError = error as FetchBaseQueryError;
  const data = 'data' in queryError && isErrorBody(queryError.data)
    ? queryError.data
    : undefined;
  const status = queryError.status;

  if (status === 400 || data?.code === 'VALIDATION') {
    return {
      status,
      code: 'VALIDATION',
      message: data?.message || 'CashMine rejected the claim details. Review the amount and destination.',
    };
  }

  if (status === 401 || data?.code === 'UNAUTHORIZED') {
    return {
      status,
      code: 'UNAUTHORIZED',
      message: 'This API token is not authorized.',
    };
  }

  if (status === 429 || data?.code === 'RATE_LIMITED') {
    return {
      status,
      code: 'RATE_LIMITED',
      message: 'CashMine is receiving too many requests. Retrying when the limit resets.',
      retryAfterMs:
        typeof data?.retryAfterMs === 'number' ? data.retryAfterMs : 15_000,
    };
  }

  if (status === 409 || data?.code === 'IDEMPOTENCY_MISMATCH') {
    return {
      status,
      code: 'IDEMPOTENCY_MISMATCH',
      message: 'The saved claim no longer matches its idempotency key. It cannot be retried safely.',
    };
  }

  if (status === 504 || data?.code === 'TIMEOUT') {
    return {
      status,
      code: 'TIMEOUT',
      message: 'CashMine timed out. Your latest confirmed balance is unchanged.',
    };
  }

  if (status === 500 || status === 503 || data?.code === 'SERVER') {
    return {
      status,
      code: 'SERVER',
      message: 'CashMine is temporarily unavailable. Please try again.',
    };
  }

  if (status === 'FETCH_ERROR' || status === 'PARSING_ERROR') {
    return {
      status,
      message: 'The claim response was not received. Its outcome is unknown.',
    };
  }

  return {
    status,
    code: data?.code,
    message: data?.message || fallback.message,
  };
}
