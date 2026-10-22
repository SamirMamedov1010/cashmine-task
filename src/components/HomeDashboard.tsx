import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sessionExpired, setAnonymous } from '../features/auth/authSlice';
import { resetClaimState } from '../features/claims/claimSlice';
import { useClaimRecovery } from '../features/claims/useClaimRecovery';
import { api, useGetBalancesQuery } from '../services/api';
import { removeStoredToken } from '../services/tokenStorage';
import { useAppDispatch } from '../store/hooks';
import { getApiError } from '../utils/apiError';
import {
  calculateTotalAvailableUsd,
  formatDecimalString,
  formatUsd,
} from '../utils/money';
import { AssetCard } from './AssetCard';
import { PrimaryButton } from './PrimaryButton';

const SNAPSHOT_INTERVAL_MS = 15_000;

function useNow(intervalMs = 1_000) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}

function getFreshness(asOf: string, now: number) {
  const timestamp = Date.parse(asOf);
  if (!Number.isFinite(timestamp)) {
    return { label: 'Freshness unknown', tone: 'stale' as const };
  }

  const ageSeconds = Math.max(0, Math.floor((now - timestamp) / 1_000));
  const relative = ageSeconds < 5 ? 'just now' : `${ageSeconds}s ago`;

  if (ageSeconds <= 30) {
    return { label: `Updated ${relative}`, tone: 'fresh' as const };
  }

  if (ageSeconds <= 60) {
    return { label: `Updating · ${relative}`, tone: 'aging' as const };
  }

  return { label: `Stale · ${relative}`, tone: 'stale' as const };
}

export function HomeDashboard() {
  const dispatch = useAppDispatch();
  const { attempt } = useClaimRecovery();
  const now = useNow();
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

  useEffect(() => {
    if (errorInfo?.code === 'UNAUTHORIZED') {
      removeStoredToken();
      dispatch(sessionExpired());
      dispatch(api.util.resetApiState());
      return;
    }
  }, [dispatch, errorInfo]);

  useEffect(() => {
    if (!rateLimitUntil) {
      return;
    }

    const delay = Math.max(0, rateLimitUntil - Date.now());
    const timeout = setTimeout(() => {
      refetch();
    }, delay);

    return () => clearTimeout(timeout);
  }, [rateLimitUntil, refetch]);

  useEffect(() => {
    if (errorInfo?.code === 'RATE_LIMITED') {
      return;
    }

    const interval = setInterval(() => {
      refetch();
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [errorInfo?.code, refetch]);

  const total = useMemo(
    () => (data ? calculateTotalAvailableUsd(data.items) : null),
    [data],
  );
  const freshness = data ? getFreshness(data.asOf, now) : null;
  const rateLimitSeconds = rateLimitUntil
    ? Math.max(1, Math.ceil((rateLimitUntil - now) / 1_000))
    : null;

  function replaceToken() {
    removeStoredToken();
    dispatch(api.util.resetApiState());
    dispatch(resetClaimState());
    dispatch(setAnonymous());
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            colors={['#5E35F2']}
            onRefresh={() => {
              void refetch();
            }}
            refreshing={Boolean(data && isFetching)}
            tintColor="#5E35F2"
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>CASHMINE</Text>
              <Text style={styles.title}>Your balances</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={replaceToken}
              style={({ pressed }) => [styles.replaceButton, pressed && styles.pressed]}
            >
              <Text style={styles.replaceText}>Replace token</Text>
            </Pressable>
          </View>

          {data && total && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total available</Text>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.totalValue}>
                {formatUsd(total)}
              </Text>
              <Text style={styles.totalCaption}>Estimated USD value</Text>
              {freshness && (
                <View style={styles.freshnessRow}>
                  <View
                    style={[
                      styles.freshnessDot,
                      styles[`${freshness.tone}Dot`],
                    ]}
                  />
                  <Text style={[styles.freshness, styles[`${freshness.tone}Text`]]}>
                    {freshness.label}
                  </Text>
                  {isFetching && <ActivityIndicator color="#6F687D" size="small" />}
                </View>
              )}
            </View>
          )}

          {attempt && (
            <View style={styles.claimBanner}>
              <View style={styles.claimBannerText}>
                <Text style={styles.claimBannerTitle}>
                  {attempt.phase === 'completed'
                    ? 'Claim completed'
                    : attempt.phase === 'failed'
                      ? 'Claim failed'
                      : 'Claim in progress'}
                </Text>
                <Text style={styles.claimBannerBody}>
                  {formatDecimalString(attempt.body.amount)} {attempt.body.asset} ·{' '}
                  {attempt.phase}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/claim')}
                style={({ pressed }) => [styles.claimBannerButton, pressed && styles.pressed]}
              >
                <Text style={styles.claimBannerButtonText}>View</Text>
              </Pressable>
            </View>
          )}

          {isLoading && !data && (
            <View style={styles.stateCard}>
              <ActivityIndicator color="#5E35F2" size="large" />
              <Text style={styles.stateTitle}>Loading balances</Text>
              <Text style={styles.stateBody}>Fetching your latest CashMine snapshot…</Text>
            </View>
          )}

          {isError && errorInfo?.code !== 'UNAUTHORIZED' && (
            <View accessibilityRole="alert" style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                {errorInfo?.code === 'RATE_LIMITED' ? 'Slow down' : 'Could not refresh'}
              </Text>
              <Text style={styles.errorBody}>{errorInfo?.message}</Text>
              {rateLimitSeconds ? (
                <Text style={styles.retryHint}>Retrying in {rateLimitSeconds}s</Text>
              ) : (
                <PrimaryButton
                  label="Try again"
                  onPress={() => {
                    void refetch();
                  }}
                  variant="secondary"
                />
              )}
            </View>
          )}

          {data?.items.length === 0 && (
            <View style={styles.stateCard}>
              <Text style={styles.emptyIcon}>◇</Text>
              <Text style={styles.stateTitle}>No balances yet</Text>
              <Text style={styles.stateBody}>
                Assets will appear here when they are available on your account.
              </Text>
            </View>
          )}

          {data && data.items.length > 0 && (
            <View style={styles.assetsSection}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Assets</Text>
                <Text style={styles.assetCount}>{data.items.length}</Text>
              </View>
              {data.items.map((item) => (
                <AssetCard
                  item={item}
                  key={item.asset}
                  onClaim={() =>
                    router.push({ pathname: '/claim', params: { asset: item.asset } })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F5FB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: '#5E35F2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    color: '#1E1830',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 3,
  },
  replaceButton: {
    paddingVertical: 10,
    paddingLeft: 8,
  },
  replaceText: {
    color: '#5E35F2',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
  totalCard: {
    backgroundColor: '#241A3A',
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
  },
  totalLabel: {
    color: '#C9C1DD',
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginTop: 8,
  },
  totalCaption: {
    color: '#AAA1BF',
    fontSize: 12,
    marginTop: 4,
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEAFE',
    borderColor: '#D8CFFD',
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    gap: 12,
  },
  claimBannerText: { flex: 1 },
  claimBannerTitle: { color: '#312A47', fontSize: 15, fontWeight: '800' },
  claimBannerBody: { color: '#6F687D', fontSize: 12, marginTop: 3 },
  claimBannerButton: {
    minHeight: 38,
    minWidth: 58,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#5E35F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBannerButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
  },
  freshnessDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
  },
  freshDot: { backgroundColor: '#61D6A6' },
  agingDot: { backgroundColor: '#F4BD50' },
  staleDot: { backgroundColor: '#F08181' },
  freshness: {
    fontSize: 12,
    fontWeight: '600',
  },
  freshText: { color: '#A8E8D0' },
  agingText: { color: '#F5D99D' },
  staleText: { color: '#F4BBBB' },
  assetsSection: {
    gap: 12,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#1E1830',
    fontSize: 20,
    fontWeight: '800',
  },
  assetCount: {
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E9E4F7',
    color: '#655D74',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 23,
    textAlign: 'center',
  },
  stateCard: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E8E4F0',
  },
  stateTitle: {
    color: '#312A47',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  stateBody: {
    color: '#787187',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 7,
  },
  emptyIcon: {
    color: '#5E35F2',
    fontSize: 42,
  },
  errorCard: {
    backgroundColor: '#FFF6F4',
    borderColor: '#F4C7BF',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  errorTitle: {
    color: '#7A271A',
    fontSize: 16,
    fontWeight: '800',
  },
  errorBody: {
    color: '#8A3C2E',
    fontSize: 14,
    lineHeight: 20,
  },
  retryHint: {
    color: '#8A3C2E',
    fontSize: 13,
    fontWeight: '700',
  },
});
