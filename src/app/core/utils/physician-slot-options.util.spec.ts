import {
  dedupePhysicianSlotOptions,
  filterPhysiciansForOperationalFacility,
  mapPhysicianApiRow
} from './physician-slot-options.util';

describe('physician-slot-options.util', () => {
  it('filterPhysiciansForOperationalFacility returns empty when facility unset', () => {
    const row = mapPhysicianApiRow({
      phyID: 99,
      facilityId: 2,
      phyDateTimeCreated: '',
      phyFirstName: null,
      phyLastName: null,
      phyFullNameCC: 'Westland Community Health Center',
      phyName: 'Westland Community Health Center',
      phyType: 'Non-Person',
      phyRateClass: null,
      phyNPI: null,
      phySpecialtyCode: null,
      phyPrimaryCodeType: 'BI',
      phyAddress1: null,
      phyCity: null,
      phyState: null,
      phyZip: null,
      phyTelephone: null,
      phyInactive: false
    });
    expect(filterPhysiciansForOperationalFacility([row], null)).toEqual([]);
    expect(filterPhysiciansForOperationalFacility([row], 1)).toHaveLength(0);
    expect(filterPhysiciansForOperationalFacility([row], 2)).toHaveLength(1);
  });

  it('dedupePhysicianSlotOptions keeps first PhyID', () => {
    const a = mapPhysicianApiRow({
      phyID: 1,
      facilityId: 1,
      phyDateTimeCreated: '',
      phyFirstName: null,
      phyLastName: null,
      phyFullNameCC: 'A',
      phyType: 'Person',
      phyRateClass: null,
      phyNPI: null,
      phySpecialtyCode: null,
      phyAddress1: null,
      phyCity: null,
      phyState: null,
      phyZip: null,
      phyTelephone: null,
      phyInactive: false
    });
    const b = { ...a, phyName: 'B' };
    expect(dedupePhysicianSlotOptions([a, b])).toHaveLength(1);
  });
});
