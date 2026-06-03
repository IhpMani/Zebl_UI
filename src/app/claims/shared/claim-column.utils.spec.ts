import { ClaimListItem } from '../../core/services/claim.models';
import { getClaimListCellValue } from './claim-column.utils';

describe('getClaimListCellValue', () => {
  it('prefers top-level claClassification over additionalColumns', () => {
    const claim = {
      claID: 1,
      claClassification: 'Billers WL',
      additionalColumns: { claClassification: 'Legacy Facility Name' }
    } as ClaimListItem;
    expect(getClaimListCellValue(claim, 'claClassification')).toBe('Billers WL');
  });

  it('does not alias claClassification to facilityName', () => {
    const claim = {
      claID: 2,
      claClassification: null,
      additionalColumns: { facilityName: 'Main Clinic' }
    } as ClaimListItem;
    expect(getClaimListCellValue(claim, 'claClassification')).toBeNull();
    expect(getClaimListCellValue(claim, 'facilityName')).toBe('Main Clinic');
  });
});
