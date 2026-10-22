import DecimalJs from 'decimal.js';

import type { BalanceItem } from '../types/api';

function groupWholeDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatDecimalString(value: string): string {
  const [whole = '0', fraction] = value.split('.');
  const groupedWhole = groupWholeDigits(whole);
  return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
}

export function calculateTotalAvailableUsd(items: BalanceItem[]): DecimalJs {
  return items.reduce(
    (total, item) =>
      total.plus(new DecimalJs(item.available).times(new DecimalJs(item.usdPrice))),
    new DecimalJs(0),
  );
}

export function formatUsd(value: DecimalJs): string {
  const [whole, fraction] = value.toDecimalPlaces(2).toFixed(2).split('.');
  return `$${groupWholeDigits(whole)}.${fraction}`;
}
