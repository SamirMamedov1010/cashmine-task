import DecimalJs from 'decimal.js';

import type { ClaimDestination } from '../../types/api';
import { createFinancialDecimalConstructor } from '../../utils/financialDecimal';

export interface ClaimAmountValidation {
  error: string | null;
  receiveAmount: DecimalJs | null;
  value: DecimalJs | null;
}

const CANONICAL_DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;

export function isAmountInputCharacters(value: string): boolean {
  return /^\d*(\.\d*)?$/.test(value);
}

export function parseClaimAmount(
  amount: string,
  decimals: number,
): Pick<ClaimAmountValidation, 'error' | 'value'> {
  if (!amount || !CANONICAL_DECIMAL.test(amount)) {
    return {
      error: 'Enter a canonical decimal amount without leading zeros.',
      value: null,
    };
  }

  const fraction = amount.split('.')[1] ?? '';
  if (fraction.length > decimals) {
    return {
      error: `Use no more than ${decimals} fractional digits.`,
      value: null,
    };
  }

  try {
    return { error: null, value: new DecimalJs(amount) };
  } catch {
    return { error: 'Please enter a valid amount.', value: null };
  }
}

export function calculateReceiveAmount(amount: string, fee: string): DecimalJs {
  const FinancialDecimal = createFinancialDecimalConstructor([amount, fee]);
  return new FinancialDecimal(amount).minus(new FinancialDecimal(fee));
}

export function isClaimDestinationValid(
  destinationId: string | null,
  destinations: readonly ClaimDestination[],
): boolean {
  return Boolean(
    destinationId && destinations.some((destination) => destination.id === destinationId),
  );
}

export function validateClaimAmount(
  amount: string,
  decimals: number,
  minAmount: string,
  available: string,
  fee: string,
): ClaimAmountValidation {
  const parsedAmount = parseClaimAmount(amount, decimals);
  if (parsedAmount.error || !parsedAmount.value) {
    return {
      error: parsedAmount.error,
      receiveAmount: null,
      value: null,
    };
  }

  try {
    const value = parsedAmount.value;
    const minimum = new DecimalJs(minAmount);
    const availableValue = new DecimalJs(available);
    const feeValue = new DecimalJs(fee);

    if (value.lessThan(minimum)) {
      return {
        error: `The minimum claim is ${minAmount}.`,
        receiveAmount: null,
        value,
      };
    }

    if (value.greaterThan(availableValue)) {
      return {
        error: 'The amount exceeds your available balance.',
        receiveAmount: null,
        value,
      };
    }

    if (value.lessThanOrEqualTo(feeValue)) {
      return {
        error: 'The amount must be greater than the fee.',
        receiveAmount: null,
        value,
      };
    }

    return {
      error: null,
      receiveAmount: calculateReceiveAmount(amount, fee),
      value,
    };
  } catch {
    return {
      error: 'Please enter a valid amount.',
      receiveAmount: null,
      value: null,
    };
  }
}
