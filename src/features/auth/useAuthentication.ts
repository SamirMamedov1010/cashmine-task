import { useCallback, useEffect, useRef } from 'react';

import { api } from '../../services/api';
import {
  loadStoredToken,
  removeStoredToken,
  storeToken,
} from '../../services/tokenStorage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getApiError } from '../../utils/apiError';
import {
  authenticate,
  beginRestoration,
  beginValidation,
  setAnonymous,
} from './authSlice';
import { resetClaimState } from '../claims/claimSlice';

export function useAuthentication() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const didInitialize = useRef(false);

  const verifyToken = useCallback(
    async (token: string, source: 'entry' | 'restore' = 'entry') => {
      dispatch(resetClaimState());
      dispatch(source === 'restore' ? beginRestoration(token) : beginValidation(token));
      const request = dispatch(
        api.endpoints.getBalances.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      );

      try {
        await request.unwrap();
        storeToken(token);
        dispatch(authenticate());
      } catch (requestError) {
        removeStoredToken();
        dispatch(api.util.resetApiState());
        dispatch(setAnonymous(getApiError(requestError).message));
      } finally {
        request.unsubscribe();
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (didInitialize.current) {
      return;
    }

    didInitialize.current = true;
    if (auth.status !== 'checking') {
      return;
    }

    const storedToken = loadStoredToken();
    if (storedToken) {
      void verifyToken(storedToken, 'restore');
    } else {
      dispatch(setAnonymous());
    }
  }, [auth.status, dispatch, verifyToken]);

  return {
    ...auth,
    verifyToken,
  };
}
