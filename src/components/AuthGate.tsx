import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  authenticate,
  beginValidation,
  setAnonymous,
} from '../features/auth/authSlice';
import { resetClaimState } from '../features/claims/claimSlice';
import { api } from '../services/api';
import {
  loadStoredToken,
  removeStoredToken,
  storeToken,
} from '../services/tokenStorage';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getApiError } from '../utils/apiError';
import { HomeDashboard } from './HomeDashboard';
import { TokenEntryScreen } from './TokenEntryScreen';

export function AuthGate() {
  const dispatch = useAppDispatch();
  const { error, status } = useAppSelector((state) => state.auth);
  const didInitialize = useRef(false);

  const verifyToken = useCallback(
    async (token: string) => {
      dispatch(resetClaimState());
      dispatch(beginValidation(token));
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
    const storedToken = loadStoredToken();
    if (storedToken) {
      void verifyToken(storedToken);
    } else {
      dispatch(setAnonymous());
    }
  }, [dispatch, verifyToken]);

  if (status === 'checking') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#5E35F2" size="large" />
        <Text style={styles.loadingText}>Opening CashMine…</Text>
      </View>
    );
  }

  if (status === 'authenticated') {
    return <HomeDashboard />;
  }

  return (
    <TokenEntryScreen
      error={error}
      isValidating={status === 'validating'}
      onSubmit={(token) => void verifyToken(token)}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#F7F5FB',
  },
  loadingText: {
    color: '#6F687D',
    fontSize: 15,
  },
});
