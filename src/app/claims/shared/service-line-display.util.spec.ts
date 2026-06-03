import {
  formatServiceLineDiagnosisPointerDisplay,
  formatServiceLineEmgDisplay,
  formatServiceLineModifierDisplay
} from './service-line-display.util';

describe('service-line-display.util', () => {
  describe('formatServiceLineDiagnosisPointerDisplay', () => {
    it('defaults empty to 1', () => {
      expect(formatServiceLineDiagnosisPointerDisplay(null)).toBe('1');
      expect(formatServiceLineDiagnosisPointerDisplay('')).toBe('1');
    });

    it('normalizes colon and comma separators', () => {
      expect(formatServiceLineDiagnosisPointerDisplay('1:2:3')).toBe('1,2,3');
      expect(formatServiceLineDiagnosisPointerDisplay('2,4')).toBe('2,4');
      expect(formatServiceLineDiagnosisPointerDisplay('1 2 3')).toBe('1,2,3');
    });

    it('dedupes and sorts', () => {
      expect(formatServiceLineDiagnosisPointerDisplay('3,1,2,1')).toBe('1,2,3');
    });
  });

  describe('formatServiceLineEmgDisplay', () => {
    it('shows Y for emergency flags', () => {
      expect(formatServiceLineEmgDisplay('Y')).toBe('Y');
      expect(formatServiceLineEmgDisplay('yes')).toBe('Y');
    });

    it('blank for non-emergency', () => {
      expect(formatServiceLineEmgDisplay(null)).toBe('');
      expect(formatServiceLineEmgDisplay('N')).toBe('');
    });
  });

  describe('formatServiceLineModifierDisplay', () => {
    it('trims modifier', () => {
      expect(formatServiceLineModifierDisplay(' 25 ')).toBe('25');
    });
  });
});
