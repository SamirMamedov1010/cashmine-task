import DecimalJs from 'decimal.js';

const MINIMUM_OPERATION_PRECISION = 40;

function countDigits(value: string): number {
  return value.replace(/\D/g, '').length;
}

export function createFinancialDecimalConstructor(values: readonly string[]) {
  const requiredPrecision = values.reduce(
    (total, value) => total + countDigits(value),
    MINIMUM_OPERATION_PRECISION,
  );

  return DecimalJs.clone({ precision: requiredPrecision });
}
