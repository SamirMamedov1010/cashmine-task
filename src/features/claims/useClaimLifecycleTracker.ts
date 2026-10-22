import { useEffect, useRef } from 'react';

import { notify } from '../../notifications/notifications';
import { api, useLazyGetClaimQuery } from '../../services/api';
import { removeStoredToken } from '../../services/tokenStorage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getApiError } from '../../utils/apiError';
import { sessionExpired } from '../auth/authSlice';
import { setClaimAttempt } from './claimSlice';
import { saveClaimAttempt } from './claimStorage';
import type { ClaimAttempt } from './types';

const POLL_INTERVAL_MS = 3_000;
const ERROR_RETRY_INTERVAL_MS = 10_000;

export function useClaimLifecycleTracker() {
  const dispatch = useAppDispatch();
  const { attempt, scope } = useAppSelector((state) => state.claim);
  const [triggerClaim] = useLazyGetClaimQuery();
  const notifiedStatus = useRef<string | null>(null);

  useEffect(() => {
    if (attempt?.phase !== 'pending' || !attempt.claimId || !scope) {
      return;
    }

    const activeAttempt = attempt;
    const activeClaimId = attempt.claimId;
    const activeScope = scope;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const status = await triggerClaim(activeClaimId, false).unwrap();
        if (cancelled) {
          return;
        }

        if (status.status === 'pending') {
          timeout = setTimeout(() => void poll(), POLL_INTERVAL_MS);
          return;
        }

        const settledAttempt: ClaimAttempt = {
          ...activeAttempt,
          phase: status.status,
          failureReason: status.failureReason,
          message: undefined,
          retryAfterUntil: undefined,
        };
        await saveClaimAttempt(activeScope, settledAttempt);
        dispatch(setClaimAttempt({ attempt: settledAttempt, scope: activeScope }));
        dispatch(api.util.invalidateTags(['Balances']));

        if (notifiedStatus.current !== status.status) {
          notifiedStatus.current = status.status;
          if (status.status === 'completed') {
            notify.success({ title: 'Claim completed' });
          } else {
            notify.error({ title: 'Claim failed', detail: status.failureReason });
          }
        }
      } catch (pollError) {
        if (cancelled) {
          return;
        }

        const errorInfo = getApiError(pollError);
        if (errorInfo.code === 'UNAUTHORIZED') {
          removeStoredToken();
          dispatch(sessionExpired());
          dispatch(api.util.resetApiState());
          notify.error({ title: 'API token unauthorized' });
          return;
        }

        const delay =
          errorInfo.code === 'RATE_LIMITED'
            ? (errorInfo.retryAfterMs ?? 15_000)
            : ERROR_RETRY_INTERVAL_MS;
        timeout = setTimeout(() => void poll(), delay);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [attempt, dispatch, scope, triggerClaim]);
}
