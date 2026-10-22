import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { ClaimAttempt } from '../features/claims/types';
import { useNow } from '../hooks/useNow';
import { formatDecimalString } from '../utils/money';
import { PrimaryButton } from './PrimaryButton';

interface ClaimStatusPanelProps {
  attempt: ClaimAttempt;
  isSubmitting: boolean;
  onClear: () => void;
  onRetry: () => void;
  onReturnHome: () => void;
}

function phaseContent(attempt: ClaimAttempt) {
  switch (attempt.phase) {
    case 'submitting':
      return {
        title: 'Submitting claim',
        body: 'Your request is being sent with a protected idempotency key.',
      };
    case 'unknown':
      return {
        title: 'Outcome unknown',
        body:
          attempt.message ||
          'The response was lost. Replay the saved request to recover it safely.',
      };
    case 'retryable':
      return {
        title: 'Claim needs a safe retry',
        body: attempt.message || 'The exact saved request can be replayed safely.',
      };
    case 'pending':
      return {
        title: 'Claim processing',
        body: 'CashMine accepted the claim. This usually settles in about 20 seconds.',
      };
    case 'completed':
      return {
        title: 'Claim completed',
        body: 'The claim has settled successfully.',
      };
    case 'failed':
      return {
        title: 'Claim failed',
        body: attempt.failureReason || 'CashMine did not provide a failure reason.',
      };
    case 'blocked':
      return {
        title: 'Claim recovery blocked',
        body:
          attempt.message ||
          'The idempotency record cannot be replayed safely. Contact support before trying again.',
      };
  }
}

export function ClaimStatusPanel({
  attempt,
  isSubmitting,
  onClear,
  onRetry,
  onReturnHome,
}: ClaimStatusPanelProps) {
  const now = useNow(Boolean(attempt.retryAfterUntil));
  const content = phaseContent(attempt);

  const retrySeconds = useMemo(() => {
    if (!attempt.retryAfterUntil) {
      return 0;
    }
    if (now === 0) {
      return 1;
    }
    return Math.max(0, Math.ceil((attempt.retryAfterUntil - now) / 1_000));
  }, [attempt.retryAfterUntil, now]);

  const isWorking = attempt.phase === 'submitting' || attempt.phase === 'pending';
  const canRetry =
    (attempt.phase === 'unknown' || attempt.phase === 'retryable') &&
    retrySeconds === 0 &&
    !isSubmitting;
  const isSettled = attempt.phase === 'completed' || attempt.phase === 'failed';

  return (
    <View style={styles.card}>
      <View style={styles.statusIcon}>
        {isWorking ? (
          <ActivityIndicator color="#5E35F2" size="large" />
        ) : (
          <Text style={styles.statusSymbol}>
            {attempt.phase === 'completed' ? '✓' : attempt.phase === 'failed' ? '!' : '?'}
          </Text>
        )}
      </View>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.body}>{content.body}</Text>

      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>
            {formatDecimalString(attempt.body.amount)} {attempt.body.asset}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Destination</Text>
          <Text numberOfLines={1} style={styles.value}>
            {attempt.body.destinationId}
          </Text>
        </View>
        {attempt.claimId && (
          <View style={styles.row}>
            <Text style={styles.label}>Claim ID</Text>
            <Text numberOfLines={1} selectable style={styles.value}>
              {attempt.claimId}
            </Text>
          </View>
        )}
      </View>

      {retrySeconds > 0 && (
        <Text style={styles.retryMessage}>Safe retry available in {retrySeconds}s</Text>
      )}

      {canRetry && (
        <PrimaryButton
          label="Replay saved request safely"
          loading={isSubmitting}
          onPress={onRetry}
        />
      )}
      {isSettled && (
        <PrimaryButton
          label={attempt.phase === 'completed' ? 'Done' : 'Start another claim'}
          onPress={onClear}
        />
      )}
      {attempt.phase === 'blocked' && (
        <PrimaryButton label="Return home" onPress={onReturnHome} variant="secondary" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderColor: '#E8E4F0',
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSymbol: {
    color: '#5E35F2',
    fontSize: 30,
    fontWeight: '900',
  },
  title: {
    color: '#1E1830',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: '#6F687D',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  details: {
    width: '100%',
    backgroundColor: '#F7F5FB',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: '#787187',
    fontSize: 13,
  },
  value: {
    color: '#312A47',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  retryMessage: {
    color: '#7A5B15',
    fontSize: 13,
    fontWeight: '700',
  },
});
