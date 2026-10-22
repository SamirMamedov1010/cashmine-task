import { useCallback, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  beginClaimLoad,
  failClaimLoad,
  setClaimAttempt,
} from './claimSlice';
import {
  deleteClaimAttempt,
  getTokenScope,
  loadClaimAttempt,
  saveClaimAttempt,
} from './claimStorage';
import type { ClaimAttempt } from './types';

export function useClaimRecovery() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const claimState = useAppSelector((state) => state.claim);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    dispatch(beginClaimLoad());

    void (async () => {
      try {
        const scope = await getTokenScope(token);
        let attempt = await loadClaimAttempt(scope);

        if (attempt?.phase === 'submitting') {
          attempt = {
            ...attempt,
            phase: 'unknown',
            message: 'The app closed before the submission response was confirmed.',
          };
          await saveClaimAttempt(scope, attempt);
        }

        if (!cancelled) {
          dispatch(setClaimAttempt({ attempt, scope }));
        }
      } catch {
        if (!cancelled) {
          dispatch(failClaimLoad());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, token]);

  const persist = useCallback(
    async (attempt: ClaimAttempt) => {
      if (!claimState.scope) {
        throw new Error('Claim recovery is not ready.');
      }

      await saveClaimAttempt(claimState.scope, attempt);
      dispatch(setClaimAttempt({ attempt, scope: claimState.scope }));
    },
    [claimState.scope, dispatch],
  );

  const clear = useCallback(async () => {
    if (!claimState.scope) {
      return;
    }

    await deleteClaimAttempt(claimState.scope);
    dispatch(setClaimAttempt({ attempt: null, scope: claimState.scope }));
  }, [claimState.scope, dispatch]);

  return {
    ...claimState,
    clear,
    persist,
  };
}
