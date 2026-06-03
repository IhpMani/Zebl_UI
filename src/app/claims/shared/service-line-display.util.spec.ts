import {
  formatServiceLineDiagnosisPointerDisplay,
  formatServiceLineEmgDisplay,
  formatServiceLineModifierDisplay
} from './service-line-display.util';

describe('service-line-display.util', () => {
  describe('formatServiceLineDiagnosisPointerDisplay', () => {
    it('renders blank when pointer unset', () => {
      expect(formatServiceLineDiagnosisPointerDisplay(null)).toBe('');
      expect(formatServiceLineDiagnosisPointerDisplay('')).toBe('');
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
    it('shows Yes for emergency flags', () => {
      expect(formatServiceLineEmgDisplay('Y')).toBe('Yes');
      expect(formatServiceLineEmgDisplay('yes')).toBe('Yes');
    });

    it('shows No for non-emergency', () => {
      expect(formatServiceLineEmgDisplay(null)).toBe('No');
      expect(formatServiceLineEmgDisplay('N')).toBe('No');
    });
  });

  describe('formatServiceLineModifierDisplay', () => {
    it('trims modifier', () => {
      expect(formatServiceLineModifierDisplay(' 25 ')).toBe('25');
    });
  });
});
