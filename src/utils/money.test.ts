import { describe, expect, it } from 'vitest';

import type { BalanceItem } from '../types/api';
import { calculateTotalAvailableUsd } from './money';

function balance(
  available: string,
  usdPrice: string,
  asset = 'TEST',
  decimals = 18,
): BalanceItem {
  return {
    asset,
    decimals,
    available,
    pending: '0',
    claiming: '0',
    usdPrice,
  };
}

describe('total available USD calculation', () => {
  it('totals multiple assets with different USD prices', () => {
    const items = [
      balance('820.413207', '1.0002', 'USDT', 6),
      balance('0.5', '3500.25', 'ETH'),
      balance('0.01', '67890.12', 'BTC', 8),
    ];

    expect(calculateTotalAvailableUsd(items).toFixed()).toBe('3249.6034896414');
  });

  it('uses decimal-string multiplication rather than binary floating point', () => {
    expect(calculateTotalAvailableUsd([balance('0.1', '0.2')]).toFixed()).toBe(
      '0.02',
    );
  });

  it('returns zero for an empty asset list', () => {
    expect(calculateTotalAvailableUsd([]).toFixed()).toBe('0');
  });

  it('preserves very small balances', () => {
    expect(
      calculateTotalAvailableUsd([balance('0.00000001', '67890.12345678', 'BTC', 8)]).toFixed(),
    ).toBe('0.0006789012345678');
  });

  it('preserves high-precision multiplication beyond Decimal default precision', () => {
    expect(
      calculateTotalAvailableUsd([
        balance('123456789.123456789', '98765.43210987654321'),
      ]).toFixed(),
    ).toBe('12193263124676.11632360920590112635269');
  });
});
