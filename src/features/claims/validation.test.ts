import { describe, expect, it } from 'vitest';

import {
  calculateReceiveAmount,
  isAmountInputCharacters,
  isClaimDestinationValid,
  parseClaimAmount,
  validateClaimAmount,
} from './validation';

describe('claim amount parsing', () => {
  it.each(['1', '0.5', '12.345'])('accepts canonical amount %s', (amount) => {
    const result = parseClaimAmount(amount, 6);

    expect(result.error).toBeNull();
    expect(result.value?.toFixed()).toBe(amount);
  });

  it.each(['', '.5', '1.', '05', '1e-3', '-1', 'abc', ' 1 ', '1 '])(
    'rejects non-canonical amount %j',
    (amount) => {
      const result = parseClaimAmount(amount, 18);

      expect(result.error).not.toBeNull();
      expect(result.value).toBeNull();
    },
  );

  it('allows incomplete numeric text only while editing', () => {
    expect(isAmountInputCharacters('')).toBe(true);
    expect(isAmountInputCharacters('.5')).toBe(true);
    expect(isAmountInputCharacters('1.')).toBe(true);
    expect(parseClaimAmount('.5', 6).value).toBeNull();
    expect(parseClaimAmount('1.', 6).value).toBeNull();
  });
});

describe('asset precision', () => {
  it('rejects excessive fractional digits without rounding', () => {
    const result = parseClaimAmount('1.234', 2);

    expect(result.error).toBe('Use no more than 2 fractional digits.');
    expect(result.value).toBeNull();
  });

  it('accepts the smallest 8-decimal BTC unit', () => {
    expect(parseClaimAmount('0.00000001', 8).value?.toFixed()).toBe('0.00000001');
    expect(parseClaimAmount('0.000000001', 8).value).toBeNull();
  });

  it('accepts the smallest 18-decimal ETH unit', () => {
    expect(parseClaimAmount('0.000000000000000001', 18).value?.toFixed()).toBe(
      '0.000000000000000001',
    );
    expect(parseClaimAmount('0.0000000000000000001', 18).value).toBeNull();
  });
});

describe('claim validation', () => {
  const validate = (amount: string) =>
    validateClaimAmount(amount, 6, '0.01', '10.5', '0.0012');

  it('rejects an amount below the minimum', () => {
    expect(validate('0.009').error).toBe('The minimum claim is 0.01.');
  });

  it('accepts an amount exactly equal to the minimum', () => {
    const result = validate('0.01');

    expect(result.error).toBeNull();
    expect(result.receiveAmount?.toFixed()).toBe('0.0088');
  });

  it('rejects an amount greater than available', () => {
    expect(validate('10.500001').error).toBe(
      'The amount exceeds your available balance.',
    );
  });

  it('accepts the full available balance as Max without changing precision', () => {
    const available = '10.500000';
    const result = validateClaimAmount(available, 6, '0.01', available, '0.0012');

    expect(result.error).toBeNull();
    expect(result.value?.toFixed(6)).toBe(available);
    expect(result.receiveAmount?.toFixed()).toBe('10.4988');
  });

  it('rejects zero', () => {
    expect(validate('0').error).not.toBeNull();
    expect(validate('0').receiveAmount).toBeNull();
  });

  it.each(['0.0012', '0.0011'])('rejects amount %s when it is not above the fee', (amount) => {
    const result = validateClaimAmount(amount, 6, '0', '1', '0.0012');

    expect(result.error).toBe('The amount must be greater than the fee.');
    expect(result.receiveAmount).toBeNull();
  });

  it('validates the destination against server-provided options', () => {
    const destinations = [
      { id: 'dest_wallet', label: 'Wallet' },
      { id: 'dest_vault', label: 'Vault' },
    ];

    expect(isClaimDestinationValid('dest_wallet', destinations)).toBe(true);
    expect(isClaimDestinationValid('unknown', destinations)).toBe(false);
    expect(isClaimDestinationValid(null, destinations)).toBe(false);
  });
});

describe('fee and receive amount calculation', () => {
  it('subtracts the fee exactly without binary floating-point errors', () => {
    expect(calculateReceiveAmount('0.3', '0.1').toFixed()).toBe('0.2');
    expect(calculateReceiveAmount('0.5', '0.0012').toFixed()).toBe('0.4988');
  });

  it('preserves more than 20 significant digits during subtraction', () => {
    expect(
      calculateReceiveAmount(
        '12345678901234567890.123456789012345678',
        '0.000000000000000001',
      ).toFixed(),
    ).toBe('12345678901234567890.123456789012345677');
  });

  it('never exposes a zero or negative payout as valid', () => {
    expect(validateClaimAmount('0.1', 1, '0', '1', '0.1').receiveAmount).toBeNull();
    expect(validateClaimAmount('0.1', 1, '0', '1', '0.2').receiveAmount).toBeNull();
  });
});
