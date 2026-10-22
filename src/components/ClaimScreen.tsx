import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useClaimFlow } from '../features/claims/useClaimFlow';
import { ClaimForm } from './ClaimForm';
import { ClaimStatusPanel } from './ClaimStatusPanel';
import { PrimaryButton } from './PrimaryButton';

export function ClaimScreen() {
  const params = useLocalSearchParams<{ asset?: string }>();
  const claim = useClaimFlow(
    typeof params.asset === 'string' ? params.asset : undefined,
  );

  useEffect(() => {
    if (!claim.isAuthenticated) {
      router.replace('/');
    }
  }, [claim.isAuthenticated]);

  async function finishAttempt() {
    await claim.clearAttempt();
    router.replace('/');
  }

  if (claim.recoveryStatus !== 'ready') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          {claim.recoveryStatus === 'error' ? (
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

          {claim.attempt ? (
            <ClaimStatusPanel
              attempt={claim.attempt}
              isSubmitting={claim.isSubmitting}
              onClear={() => void finishAttempt()}
              onRetry={() => void claim.retryAttempt()}
              onReturnHome={() => router.replace('/')}
            />
          ) : (
            <ClaimForm
              amount={claim.amount}
              amountTouched={claim.amountTouched}
              amountValidation={claim.amountValidation}
              assets={claim.assets}
              canReview={claim.canReview}
              destinationId={claim.destinationId}
              isConfirming={claim.isConfirming}
              isLoadingOptions={claim.isLoadingOptions}
              isSubmitting={claim.isSubmitting}
              onAmountBlur={claim.touchAmount}
              onAmountChange={claim.changeAmount}
              onCancelConfirmation={claim.closeConfirmation}
              onConfirm={() => void claim.submitNewClaim()}
              onOpenConfirmation={claim.openConfirmation}
              onRefetchOptions={claim.refetchOptions}
              onSelectAsset={claim.selectAsset}
              onSelectDestination={claim.selectDestination}
              onSetMax={() => {
                if (claim.selectedBalance) {
                  claim.setAmount(claim.selectedBalance.available);
                  claim.touchAmount();
                }
              }}
              options={claim.options}
              optionsError={claim.optionsErrorInfo}
              optionsRetrySeconds={claim.optionsRetrySeconds}
              selectedAsset={claim.selectedAsset}
              selectedBalance={claim.selectedBalance}
            />
          )}
        </View>
      </ScrollView>
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
  pressed: { opacity: 0.68 },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 180,
    paddingHorizontal: 24,
  },
  helper: { color: '#787187', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  errorTitle: { color: '#7A271A', fontSize: 16, fontWeight: '800' },
});
