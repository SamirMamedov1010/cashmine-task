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

import type { ClaimAmountValidation } from '../features/claims/validation';
import type { ApiErrorInfo } from '../utils/apiError';
import type {
  BalanceItem,
  ClaimOptionsResponse,
} from '../types/api';
import { formatDecimalString } from '../utils/money';
import { PrimaryButton } from './PrimaryButton';

interface ClaimFormProps {
  amount: string;
  amountTouched: boolean;
  amountValidation: ClaimAmountValidation;
  assets: BalanceItem[];
  canReview: boolean;
  destinationId: string | null;
  isConfirming: boolean;
  isLoadingOptions: boolean;
  isSubmitting: boolean;
  onAmountBlur: () => void;
  onAmountChange: (value: string) => void;
  onCancelConfirmation: () => void;
  onConfirm: () => void;
  onOpenConfirmation: () => void;
  onRefetchOptions: () => void;
  onSelectAsset: (asset: string) => void;
  onSelectDestination: (destinationId: string) => void;
  onSetMax: () => void;
  options?: ClaimOptionsResponse;
  optionsError: ApiErrorInfo | null;
  optionsRetrySeconds: number;
  selectedAsset: string | null;
  selectedBalance: BalanceItem | null;
}

function AssetSelector({
  assets,
  onSelect,
  selectedAsset,
}: Pick<ClaimFormProps, 'assets' | 'selectedAsset'> & {
  onSelect: (asset: string) => void;
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

export function ClaimForm(props: ClaimFormProps) {
  const {
    amount,
    amountTouched,
    amountValidation,
    assets,
    canReview,
    destinationId,
    isConfirming,
    isLoadingOptions,
    isSubmitting,
    onAmountBlur,
    onAmountChange,
    onCancelConfirmation,
    onConfirm,
    onOpenConfirmation,
    onRefetchOptions,
    onSelectAsset,
    onSelectDestination,
    onSetMax,
    options,
    optionsError,
    optionsRetrySeconds,
    selectedAsset,
    selectedBalance,
  } = props;

  return (
    <>
      <View>
        <Text style={styles.sectionLabel}>Select asset</Text>
        <AssetSelector
          assets={assets}
          onSelect={onSelectAsset}
          selectedAsset={selectedAsset}
        />
      </View>

      {!selectedBalance && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {assets.length === 0 ? 'No claimable balances' : 'Choose an asset to continue'}
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

      {optionsError?.code !== 'UNAUTHORIZED' && optionsError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load claim options</Text>
          <Text style={styles.errorBody}>{optionsError.message}</Text>
          <PrimaryButton
            disabled={optionsRetrySeconds > 0}
            label={
              optionsRetrySeconds > 0
                ? `Try again in ${optionsRetrySeconds}s`
                : 'Try again'
            }
            onPress={onRefetchOptions}
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
                onBlur={onAmountBlur}
                onChangeText={onAmountChange}
                placeholder="0.00"
                placeholderTextColor="#AAA4B3"
                style={styles.amountInput}
                value={amount}
              />
              <Pressable
                accessibilityRole="button"
                onPress={onSetMax}
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
                    onPress={() => onSelectDestination(destination.id)}
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
            onPress={onOpenConfirmation}
          />
        </>
      )}

      <Modal
        animationType="fade"
        onRequestClose={onCancelConfirmation}
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
                onPress={onCancelConfirmation}
                style={styles.modalButton}
                variant="secondary"
              />
              <PrimaryButton
                label="Confirm claim"
                loading={isSubmitting}
                onPress={onConfirm}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 180,
  },
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
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderColor: '#AAA4B3',
    borderWidth: 2,
  },
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
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  modalTitle: { color: '#1E1830', fontSize: 22, fontWeight: '800' },
  modalBody: { color: '#6F687D', fontSize: 15, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalButton: { flex: 1 },
});
