import {
  columnMatchesListPickerSearch,
  dedupeListPickerColumns,
  filterListPickerColumns,
  runListColumnPickerRuntimeCheck
} from './list-column-picker.utils';

describe('list-column-picker.utils', () => {
  it('matches camelCase keys with spaced search terms', () => {
    const col = { key: 'claClassification', label: 'Claim Classification' };
    expect(columnMatchesListPickerSearch(col, 'claClassification')).toBe(true);
    expect(columnMatchesListPickerSearch(col, 'claclassification')).toBe(true);
    expect(columnMatchesListPickerSearch(col, 'claim classification')).toBe(true);
  });

  it('detects duplicate keys', () => {
    const report = dedupeListPickerColumns([
      { key: 'patMI', label: 'MI' },
      { key: 'patMI', label: 'MI' }
    ]);
    expect(report.unique).toHaveLength(1);
    expect(report.duplicateKeys).toHaveLength(1);
  });

  it('flags patClassification Facility label in runtime check', () => {
    const report = runListColumnPickerRuntimeCheck('Find Patients', [
      { key: 'patClassification', label: 'Facility' }
    ]);
    expect(report.badLabelFields.some((b) => b.key === 'patClassification')).toBe(true);
  });

  it('filters by key and label', () => {
    const cols = [
      { key: 'payClassification', label: 'Payer Classification' },
      { key: 'payID', label: 'Payer ID' }
    ];
    expect(filterListPickerColumns(cols, 'payClassification')).toHaveLength(1);
  });
});
