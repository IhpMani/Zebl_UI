import {
  buildAddColumnPickerModel,
  columnMatchesSearch,
  findPickerColumn
} from './claim-add-column-dialog.utils';
import { ClaimListAdditionalColumns } from '../claim-list/claim-list-additional-columns';

describe('claim-add-column-dialog.utils', () => {
  it('includes claClassification in merged picker', () => {
    const all = ClaimListAdditionalColumns.getAllColumns();
    const cla = all.find((c) => c.key === 'claClassification');
    expect(cla).toBeDefined();
    expect(cla!.label).toBe('Claim Classification');
    expect(cla!.category).toBe('Classification');
  });

  it('finds claClassification by label, key, and partial key searches', () => {
    for (const q of ['classification', 'claim classification', 'claClassification', 'claclassification']) {
      const hit = findPickerColumn(q, 'claClassification');
      expect(hit?.key).toBe('claClassification', `search "${q}"`);
    }
  });

  it('columnMatchesSearch matches property keys', () => {
    const col = ClaimListAdditionalColumns.findByKey('claClassification')!;
    expect(columnMatchesSearch(col, 'claClassification')).toBe(true);
    expect(columnMatchesSearch(col, 'facility')).toBe(false);
  });

  it('buildAddColumnPickerModel omits empty categories', () => {
    const model = buildAddColumnPickerModel('');
    expect(model.categories.length).toBeGreaterThan(0);
    expect(model.categories.every((cat) => (model.columnsByCategory.get(cat)?.length ?? 0) > 0)).toBe(true);
    expect(model.totalColumns).toBe(ClaimListAdditionalColumns.getAllColumns().length);
  });
});
