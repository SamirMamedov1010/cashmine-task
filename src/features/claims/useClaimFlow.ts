import * as Crypto from 'expo-crypto';
import { useMemo, useRef, useState, useEffect } from 'react';

import { useNow } from '../../hooks/useNow';
import { notify } from '../../notifications/notifications';
import {
  api,
  useCreateClaimMutation,
  useGetBalancesQuery,
  useGetClaimOptionsQuery,
} from '../../services/api';
import { removeStoredToken } from '../../services/tokenStorage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { CreateClaimRequest } from '../../types/api';
import { getApiError } from '../../utils/apiError';
import { isPositiveDecimal } from '../../utils/money';
import { sessionExpired } from '../auth/authSlice';
import { hasClaimId } from './response';
import type { ClaimAttempt } from './types';
import { useClaimRecovery } from './useClaimRecovery';
import {
  isAmountInputCharacters,
  validateClaimAmount,
} from './validation';

export function useClaimFlow(initialAsset?: string) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const submissionLock = useRef(false);
  const optionsErrorNotifiedFor = useRef<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(initialAsset ?? null);
  const [amount, setAmount] = useState('');
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [amountTouched, setAmountTouched] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
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
  const now = useNow(Boolean(optionsRetryUntil));
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

  function selectAsset(asset: string) {
    setSelectedAsset(asset);
    setAmount('');
    setDestinationId(null);
    setAmountTouched(false);
    optionsErrorNotifiedFor.current = null;
  }

  function changeAmount(value: string) {
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
        await persist({
          ...submittingAttempt,
          phase: 'unknown',
          message: 'CashMine responded without a usable claim ID.',
        });
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
    await executeAttempt({
      version: 1,
      idempotencyKey: Crypto.randomUUID(),
      body,
      phase: 'submitting',
      createdAt: new Date().toISOString(),
    });
  }

  return {
    amount,
    amountTouched,
    amountValidation,
    assets,
    attempt,
    canReview,
    changeAmount,
    clearAttempt: clear,
    closeConfirmation: () => setIsConfirming(false),
    destinationId,
    isAuthenticated: Boolean(token),
    isConfirming,
    isLoadingOptions,
    isSubmitting,
    openConfirmation: () => setIsConfirming(true),
    options,
    optionsErrorInfo,
    optionsRetrySeconds,
    recoveryStatus,
    refetchOptions: () => void refetchOptions(),
    retryAttempt: () => (attempt ? executeAttempt(attempt) : Promise.resolve()),
    selectAsset,
    selectDestination: setDestinationId,
    selectedAsset,
    selectedBalance,
    setAmount: changeAmount,
    submitNewClaim,
    touchAmount: () => setAmountTouched(true),
  };
}
