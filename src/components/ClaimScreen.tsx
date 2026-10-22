import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sessionExpired } from '../features/auth/authSlice';
import type { ClaimAttempt } from '../features/claims/types';
import { useClaimRecovery } from '../features/claims/useClaimRecovery';
import {
  isAmountInputCharacters,
  validateClaimAmount,
} from '../features/claims/validation';
import { notify } from '../notifications/notifications';
import {
  api,
  useCreateClaimMutation,
  useGetBalancesQuery,
  useGetClaimOptionsQuery,
} from '../services/api';
import { removeStoredToken } from '../services/tokenStorage';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { BalanceItem, CreateClaimRequest } from '../types/api';
import { getApiError } from '../utils/apiError';
import { formatDecimalString, isPositiveDecimal } from '../utils/money';
import { ClaimStatusPanel } from './ClaimStatusPanel';
import { PrimaryButton } from './PrimaryButton';

function hasClaimId(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    value.id.length > 0
  );
}

function AssetSelector({
  assets,
  onSelect,
  selectedAsset,
}: {
  assets: BalanceItem[];
  onSelect: (asset: string) => void;
  selectedAsset: string | null;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.assetList}
      showsHorizontalScrollIndicator={false}
    >
      {assets.map((item) => {
        const selected = item.asset === selectedAsset;
        return (
          <Pressable
            accessibilityRole="button"
            key={item.asset}
            onPress={() => onSelect(item.asset)}
            style={({ pressed }) => [
              styles.assetChip,
              selected && styles.assetChipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.assetChipText, selected && styles.assetChipTextSelected]}>
              {item.asset}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ClaimScreen() {
  const params = useLocalSearchParams<{ asset?: string }>();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const submissionLock = useRef(false);
  const optionsErrorNotifiedFor = useRef<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(
    typeof params.asset === 'string' ? params.asset : null,
  );
  const [amount, setAmount] = useState('');
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [amountTouched, setAmountTouched] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [now, setNow] = useState(0);
  const { data: balances } = useGetBalancesQuery();
  const { attempt, clear, persist, status: recoveryStatus } = useClaimRecovery();
  const [createClaim, { isLoading: isSubmitting }] = useCreateClaimMutation();

  const assets = useMemo(
    () => balances?.items.filter((item) => isPositiveDecimal(item.available)) ?? [],
    [balances],
  );
  const selectedBalance = assets.find((item) => item.asset === selectedAsset) ?? null;
  const {
    data: options,
    error: optionsError,
    isFetching: isLoadingOptions,
    refetch: refetchOptions,
    startedTimeStamp: optionsStartedTimeStamp,
  } = useGetClaimOptionsQuery(selectedAsset ?? '', {
    skip: !selectedBalance || Boolean(attempt),
  });
  const optionsErrorInfo = useMemo(
    () => (optionsError ? getApiError(optionsError) : null),
    [optionsError],
  );
  const optionsRetryUntil =
    optionsErrorInfo?.code === 'RATE_LIMITED'
      ? (optionsStartedTimeStamp ?? 0) + (optionsErrorInfo.retryAfterMs ?? 15_000)
      : null;
  const optionsRetrySeconds = optionsRetryUntil
    ? Math.max(
        0,
        Math.ceil((optionsRetryUntil - (now || optionsStartedTimeStamp || 0)) / 1_000),
      )
    : 0;
  const amountValidation = useMemo(() => {
    if (!selectedBalance || !options) {
      return { error: null, receiveAmount: null, value: null };
    }

    return validateClaimAmount(
      amount,
      selectedBalance.decimals,
      options.minAmount,
      selectedBalance.available,
      options.fee,
    );
  }, [amount, options, selectedBalance]);
  const destinationIsValid = Boolean(
    destinationId && options?.destinations.some((item) => item.id === destinationId),
  );
  const canReview =
    Boolean(amount) &&
    !amountValidation.error &&
    Boolean(amountValidation.receiveAmount) &&
    destinationIsValid;

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token]);

  useEffect(() => {
    if (optionsErrorInfo?.code === 'UNAUTHORIZED') {
      removeStoredToken();
      dispatch(sessionExpired());
      dispatch(api.util.resetApiState());
      return;
    }

    if (
      optionsError &&
      selectedAsset &&
      optionsErrorNotifiedFor.current !== selectedAsset
    ) {
      optionsErrorNotifiedFor.current = selectedAsset;
      notify.error({ title: 'Unable to load claim options' });
    }
  }, [dispatch, optionsError, optionsErrorInfo?.code, selectedAsset]);

  useEffect(() => {
    if (!optionsRetryUntil) {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [optionsRetryUntil]);

  function selectAsset(asset: string) {
    setSelectedAsset(asset);
    setAmount('');
    setDestinationId(null);
    setAmountTouched(false);
    optionsErrorNotifiedFor.current = null;
  }

  function handleAmountChange(value: string) {
    if (isAmountInputCharacters(value)) {
      setAmount(value);
    }
  }

  async function executeAttempt(savedAttempt: ClaimAttempt) {
    if (submissionLock.current) {
      return;
    }

    submissionLock.current = true;
    const submittingAttempt: ClaimAttempt = {
      ...savedAttempt,
      phase: 'submitting',
      message: undefined,
      retryAfterUntil: undefined,
    };

    try {
      await persist(submittingAttempt);
    } catch {
      submissionLock.current = false;
      notify.error({
        title: 'Unable to save claim safely',
        detail: 'The claim was not sent. Check device storage and try again.',
      });
      return;
    }

    try {
      const response = await createClaim({
        body: submittingAttempt.body,
        idempotencyKey: submittingAttempt.idempotencyKey,
      }).unwrap();

      if (!hasClaimId(response)) {
        const unknownAttempt: ClaimAttempt = {
          ...submittingAttempt,
          phase: 'unknown',
          message: 'CashMine responded without a usable claim ID.',
        };
        await persist(unknownAttempt);
        notify.warning({ title: 'Claim outcome unknown — checking safely' });
        return;
      }

      await persist({
        ...submittingAttempt,
        phase: 'pending',
        claimId: response.id,
      });
      dispatch(api.util.invalidateTags(['Balances']));
      notify.success({ title: 'Claim submitted successfully' });
    } catch (requestError) {
      const errorInfo = getApiError(requestError);

      if (errorInfo.code === 'VALIDATION') {
        await clear();
        notify.error({ title: 'Claim rejected', detail: errorInfo.message });
        return;
      }

      if (errorInfo.code === 'UNAUTHORIZED') {
        await persist({
          ...savedAttempt,
          phase: 'retryable',
          message: 'Authorization expired before the claim could be confirmed.',
        });
        removeStoredToken();
        dispatch(sessionExpired());
        dispatch(api.util.resetApiState());
        notify.error({ title: 'API token unauthorized' });
        return;
      }

      if (errorInfo.code === 'IDEMPOTENCY_MISMATCH') {
        await persist({
          ...savedAttempt,
          phase: 'blocked',
          message: errorInfo.message,
        });
        notify.error({ title: 'Claim recovery blocked', detail: errorInfo.message });
        return;
      }

      if (errorInfo.code === 'RATE_LIMITED') {
        await persist({
          ...savedAttempt,
          phase: 'retryable',
          message: errorInfo.message,
          retryAfterUntil: Date.now() + (errorInfo.retryAfterMs ?? 15_000),
        });
        notify.warning({ title: 'Claim retry delayed', detail: errorInfo.message });
        return;
      }

      if (errorInfo.code === 'SERVER') {
        await persist({
          ...savedAttempt,
          phase: 'retryable',
          message: errorInfo.message,
        });
        notify.warning({ title: 'Claim needs a safe retry' });
        return;
      }

      await persist({
        ...savedAttempt,
        phase: 'unknown',
        message: errorInfo.message,
      });
      notify.warning({ title: 'Claim outcome unknown — checking safely' });
    } finally {
      submissionLock.current = false;
      setIsConfirming(false);
    }
  }

  async function submitNewClaim() {
    if (!selectedAsset || !destinationId || !canReview) {
      notify.error({ title: 'Please enter a valid amount' });
      return;
    }

    const body: CreateClaimRequest = {
      asset: selectedAsset,
      amount,
      destinationId,
    };
    const newAttempt: ClaimAttempt = {
      version: 1,
      idempotencyKey: Crypto.randomUUID(),
      body,
      phase: 'submitting',
      createdAt: new Date().toISOString(),
    };
    await executeAttempt(newAttempt);
  }

  async function finishAttempt() {
    await clear();
    router.replace('/');
  }

  if (recoveryStatus !== 'ready') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          {recoveryStatus === 'error' ? (
            <>
              <Text style={styles.errorTitle}>Claim recovery unavailable</Text>
              <Text style={styles.helper}>
                Saved recovery data could not be read. New claims are disabled to prevent a
                duplicate withdrawal.
              </Text>
              <PrimaryButton
                label="Return home"
                onPress={() => router.replace('/')}
                variant="secondary"
              />
            </>
          ) : (
            <>
              <ActivityIndicator color="#5E35F2" size="large" />
              <Text style={styles.helper}>Checking for a saved claim…</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>CASHMINE</Text>
              <Text style={styles.title}>Claim funds</Text>
            </View>
          </View>

          {attempt ? (
            <ClaimStatusPanel
              attempt={attempt}
              isSubmitting={isSubmitting}
              onClear={() => void finishAttempt()}
              onRetry={() => void executeAttempt(attempt)}
              onReturnHome={() => router.replace('/')}
            />
          ) : (
            <>
              <View>
                <Text style={styles.sectionLabel}>Select asset</Text>
                <AssetSelector
                  assets={assets}
                  onSelect={selectAsset}
                  selectedAsset={selectedAsset}
                />
              </View>

              {!selectedBalance && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    {assets.length === 0
                      ? 'No claimable balances'
                      : 'Choose an asset to continue'}
                  </Text>
                  <Text style={styles.helper}>
                    {assets.length === 0
                      ? 'An asset needs a positive available balance before it can be claimed.'
                      : 'Claim options and fees are loaded separately for each asset.'}
                  </Text>
                </View>
              )}

              {isLoadingOptions && (
                <View style={styles.loadingState}>
                  <ActivityIndicator color="#5E35F2" />
                  <Text style={styles.helper}>Loading claim options…</Text>
                </View>
              )}

              {optionsError && optionsErrorInfo?.code !== 'UNAUTHORIZED' && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Unable to load claim options</Text>
                  <Text style={styles.errorBody}>{optionsErrorInfo?.message}</Text>
                  <PrimaryButton
                    disabled={optionsRetrySeconds > 0}
                    label={
                      optionsRetrySeconds > 0
                        ? `Try again in ${optionsRetrySeconds}s`
                        : 'Try again'
                    }
                    onPress={() => void refetchOptions()}
                    variant="secondary"
                  />
                </View>
              )}

              {selectedBalance && options && (
                <>
                  <View style={styles.formCard}>
                    <View style={styles.availableRow}>
                      <Text style={styles.sectionLabel}>Amount</Text>
                      <Text style={styles.available}>
                        Available {formatDecimalString(selectedBalance.available)}{' '}
                        {selectedBalance.asset}
                      </Text>
                    </View>
                    <View style={styles.amountInputRow}>
                      <TextInput
                        accessibilityLabel="Claim amount"
                        inputMode="decimal"
                        onBlur={() => setAmountTouched(true)}
                        onChangeText={handleAmountChange}
                        placeholder="0.00"
                        placeholderTextColor="#AAA4B3"
                        style={styles.amountInput}
                        value={amount}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setAmount(selectedBalance.available);
                          setAmountTouched(true);
                        }}
                        style={({ pressed }) => [styles.maxButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.maxText}>MAX</Text>
                      </Pressable>
                    </View>
                    {amountTouched && amountValidation.error && (
                      <Text accessibilityRole="alert" style={styles.inlineError}>
                        {amountValidation.error}
                      </Text>
                    )}
                    <Text style={styles.helper}>
                      Minimum {formatDecimalString(options.minAmount)} · Up to{' '}
                      {selectedBalance.decimals} fractional digits
                    </Text>
                  </View>

                  <View style={styles.formCard}>
                    <Text style={styles.sectionLabel}>Destination</Text>
                    {options.destinations.length === 0 ? (
                      <Text style={styles.inlineError}>No destinations are available.</Text>
                    ) : (
                      options.destinations.map((destination) => {
                        const selected = destination.id === destinationId;
                        return (
                          <Pressable
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            key={destination.id}
                            onPress={() => setDestinationId(destination.id)}
                            style={({ pressed }) => [
                              styles.destination,
                              selected && styles.destinationSelected,
                              pressed && styles.pressed,
                            ]}
                          >
                            <View style={[styles.radio, selected && styles.radioSelected]} />
                            <View>
                              <Text style={styles.destinationLabel}>{destination.label}</Text>
                              <Text style={styles.destinationId}>{destination.id}</Text>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>

                  <View style={styles.breakdownCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Claim amount</Text>
                      <Text style={styles.summaryValue}>
                        {amountValidation.value ? formatDecimalString(amount) : '—'}{' '}
                        {selectedBalance.asset}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Fee</Text>
                      <Text style={styles.summaryValue}>
                        {formatDecimalString(options.fee)} {selectedBalance.asset}
                      </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.receiveLabel}>You receive</Text>
                      <Text style={styles.receiveValue}>
                        {amountValidation.receiveAmount
                          ? formatDecimalString(amountValidation.receiveAmount.toFixed())
                          : '—'}{' '}
                        {selectedBalance.asset}
                      </Text>
                    </View>
                  </View>

                  <PrimaryButton
                    disabled={!canReview}
                    label="Review claim"
                    onPress={() => setIsConfirming(true)}
                  />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsConfirming(false)}
        transparent
        visible={isConfirming}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm claim</Text>
            <Text style={styles.modalBody}>
              Claim {formatDecimalString(amount || '0')} {selectedAsset} to the selected
              destination? This action will be submitted immediately.
            </Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                disabled={isSubmitting}
                label="Cancel"
                onPress={() => setIsConfirming(false)}
                style={styles.modalButton}
                variant="secondary"
              />
              <PrimaryButton
                label="Confirm claim"
                loading={isSubmitting}
                onPress={() => void submitNewClaim()}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F5FB' },
  scrollContent: { flexGrow: 1, paddingBottom: 44 },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E4F0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#312A47', fontSize: 34, lineHeight: 36, marginTop: -3 },
  headerText: { flex: 1 },
  eyebrow: { color: '#5E35F2', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#1E1830', fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  sectionLabel: { color: '#312A47', fontSize: 15, fontWeight: '800' },
  assetList: { gap: 9, paddingVertical: 10 },
  assetChip: {
    minWidth: 72,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetChipSelected: { backgroundColor: '#5E35F2', borderColor: '#5E35F2' },
  assetChipText: { color: '#4E465E', fontSize: 14, fontWeight: '800' },
  assetChipTextSelected: { color: '#FFFFFF' },
  pressed: { opacity: 0.68 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderColor: '#E8E4F0',
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: '#312A47', fontSize: 17, fontWeight: '800' },
  helper: { color: '#787187', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 180 },
  errorCard: {
    backgroundColor: '#FFF6F4',
    borderColor: '#F4C7BF',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  errorTitle: { color: '#7A271A', fontSize: 16, fontWeight: '800' },
  errorBody: { color: '#8A3C2E', fontSize: 14, lineHeight: 20 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderColor: '#E8E4F0',
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  availableRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  available: { color: '#787187', fontSize: 12, flexShrink: 1, textAlign: 'right' },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: {
    flex: 1,
    minWidth: 0,
    height: 64,
    color: '#1E1830',
    fontSize: 30,
    fontWeight: '800',
    backgroundColor: '#F7F5FB',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  maxButton: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#EEEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxText: { color: '#5E35F2', fontSize: 13, fontWeight: '900' },
  inlineError: { color: '#B42318', fontSize: 13, lineHeight: 19 },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    borderRadius: 16,
    borderColor: '#D9D5E7',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  destinationSelected: { borderColor: '#5E35F2', backgroundColor: '#F5F2FF' },
  radio: { width: 18, height: 18, borderRadius: 9, borderColor: '#AAA4B3', borderWidth: 2 },
  radioSelected: { borderColor: '#5E35F2', borderWidth: 5 },
  destinationLabel: { color: '#312A47', fontSize: 15, fontWeight: '700' },
  destinationId: { color: '#898292', fontSize: 11, marginTop: 2 },
  breakdownCard: { backgroundColor: '#241A3A', borderRadius: 22, padding: 20, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { color: '#AAA1BF', fontSize: 14 },
  summaryValue: { color: '#E3DEEC', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  divider: { height: 1, backgroundColor: '#473D5B' },
  receiveLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  receiveValue: { color: '#A8E8D0', fontSize: 16, fontWeight: '800', flexShrink: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 48, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', maxWidth: 390, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, gap: 14 },
  modalTitle: { color: '#1E1830', fontSize: 22, fontWeight: '800' },
  modalBody: { color: '#6F687D', fontSize: 15, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalButton: { flex: 1 },
});
