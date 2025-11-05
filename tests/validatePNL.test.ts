import { isValidAddress, isValidDateString, validateDateRange, default as validatePNL } from '../src/utils/validatePNL';

describe('validatePNL utils', () => {
  test('isValidAddress accepts 0x addresses and rejects invalid', () => {
    expect(isValidAddress('0x0000000000000000000000000000000000000000').valid).toBe(true);
    expect(isValidAddress('not-an-address').valid).toBe(false);
  });

  test('isValidDateString validates YYYY-MM-DD', () => {
    expect(isValidDateString('2025-01-01')).toBe(true);
    expect(isValidDateString('2025-13-01')).toBe(false);
    expect(isValidDateString('01-01-2025')).toBe(false);
  });

  test('validateDateRange ensures start <= end and not in future', () => {
    const ok = validateDateRange('2020-01-01', '2020-01-02');
    expect(ok.valid).toBe(true);
    const bad = validateDateRange('2025-12-01', '2025-11-01');
    expect(bad.valid).toBe(false);
  });

  test('validatePNL validates address and date range', () => {
    const valid = validatePNL('0x0000000000000000000000000000000000000000', '2020-01-01', '2020-01-02');
    expect(valid.valid).toBe(true);

    const invalid = validatePNL('bad', '2020-01-01', '2020-01-02');
    expect(invalid.valid).toBe(false);
  });
});
