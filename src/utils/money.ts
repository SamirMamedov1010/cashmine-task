import DecimalJs from 'decimal.js';

import type { BalanceItem } from '../types/api';
import { createFinancialDecimalConstructor } from './financialDecimal';

function groupWholeDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatDecimalString(value: string): string {
  const [whole = '0', fraction] = value.split('.');
  const groupedWhole = groupWholeDigits(whole);
  return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
}

export function calculateTotalAvailableUsd(items: BalanceItem[]): DecimalJs {
  const FinancialDecimal = createFinancialDecimalConstructor(
    items.flatMap((item) => [item.available, item.usdPrice]),
  );

  return items.reduce(
    (total, item) =>
      total.plus(
        new FinancialDecimal(item.available).times(
          new FinancialDecimal(item.usdPrice),
        ),
      ),
    new FinancialDecimal(0),
  );
}

export function formatUsd(value: DecimalJs): string {
  const [whole, fraction] = value.toDecimalPlaces(2).toFixed(2).split('.');
  return `$${groupWholeDigits(whole)}.${fraction}`;
}

export function isPositiveDecimal(value: string): boolean {
  try {
    return new DecimalJs(value).greaterThan(0);
  } catch {
    return false;
  }
}
