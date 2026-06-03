import { isBillingClassificationCode, resolveProviderClassificationCode } from './physician-classification.util';

describe('physician-classification.util', () => {
  it('resolves Billing label to BI', () => {
    expect(resolveProviderClassificationCode('Billing')).toBe('BI');
    expect(isBillingClassificationCode('Billing')).toBe(true);
  });

  it('normalizes legacy Bi truncation to BI', () => {
    expect(resolveProviderClassificationCode('Bi')).toBe('BI');
    expect(isBillingClassificationCode('Bi')).toBe(true);
  });

  it('rejects facility classification', () => {
    expect(isBillingClassificationCode('FA')).toBe(false);
  });
});
