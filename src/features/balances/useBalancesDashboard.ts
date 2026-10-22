import { useCallback, useEffect, useMemo } from 'react';

import { useNow } from '../../hooks/useNow';
import { api, useGetBalancesQuery } from '../../services/api';
import { removeStoredToken } from '../../services/tokenStorage';
import { useAppDispatch } from '../../store/hooks';
import { getApiError } from '../../utils/apiError';
import { calculateTotalAvailableUsd } from '../../utils/money';
import { sessionExpired, setAnonymous } from '../auth/authSlice';
import { resetClaimState } from '../claims/claimSlice';
import { useClaimRecovery } from '../claims/useClaimRecovery';
import { getBalanceFreshness } from './freshness';

const SNAPSHOT_INTERVAL_MS = 15_000;

export function useBalancesDashboard() {
  const dispatch = useAppDispatch();
  const { attempt } = useClaimRecovery();
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
    startedTimeStamp,
  } = useGetBalancesQuery(undefined, {
    pollingInterval: 0,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skipPollingIfUnfocused: true,
  });
  const errorInfo = useMemo(() => (error ? getApiError(error) : null), [error]);
  const rateLimitUntil =
    errorInfo?.code === 'RATE_LIMITED'
      ? (startedTimeStamp ?? 0) + (errorInfo.retryAfterMs ?? SNAPSHOT_INTERVAL_MS)
      : null;
  const now = useNow(Boolean(data || rateLimitUntil));

  useEffect(() => {
    if (errorInfo?.code === 'UNAUTHORIZED') {
      removeStoredToken();
      dispatch(sessionExpired());
      dispatch(api.util.resetApiState());
    }
  }, [dispatch, errorInfo]);

  useEffect(() => {
    if (!rateLimitUntil) {
      return;
    }

    const delay = Math.max(0, rateLimitUntil - Date.now());
    const timeout = setTimeout(() => refetch(), delay);
    return () => clearTimeout(timeout);
  }, [rateLimitUntil, refetch]);

  useEffect(() => {
    if (errorInfo?.code === 'RATE_LIMITED') {
      return;
    }

    const interval = setInterval(() => refetch(), SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [errorInfo?.code, refetch]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const replaceToken = useCallback(() => {
    removeStoredToken();
    dispatch(api.util.resetApiState());
    dispatch(resetClaimState());
    dispatch(setAnonymous());
  }, [dispatch]);

  return {
    attempt,
    data,
    errorInfo,
    freshness: data ? getBalanceFreshness(data.asOf, now) : null,
    isError,
    isFetching,
    isLoading,
    rateLimitSeconds: rateLimitUntil
      ? Math.max(1, Math.ceil((rateLimitUntil - now) / 1_000))
      : null,
    refresh,
    replaceToken,
    total: data ? calculateTotalAvailableUsd(data.items) : null,
  };
}
