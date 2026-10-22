import DecimalJs from 'decimal.js';

export interface ClaimAmountValidation {
  error: string | null;
  receiveAmount: DecimalJs | null;
  value: DecimalJs | null;
}

const CANONICAL_DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;

export function isAmountInputCharacters(value: string): boolean {
  return /^\d*(\.\d*)?$/.test(value);
}

export function validateClaimAmount(
  amount: string,
  decimals: number,
  minAmount: string,
  available: string,
  fee: string,
): ClaimAmountValidation {
  if (!amount || !CANONICAL_DECIMAL.test(amount)) {
    return {
      error: 'Enter a canonical decimal amount without leading zeros.',
      receiveAmount: null,
      value: null,
    };
  }

  const fraction = amount.split('.')[1] ?? '';
  if (fraction.length > decimals) {
    return {
      error: `Use no more than ${decimals} fractional digits.`,
      receiveAmount: null,
      value: null,
    };
  }

  try {
    const value = new DecimalJs(amount);
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
      receiveAmount: value.minus(feeValue),
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
