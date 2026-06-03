import { PhysicianListItem } from '../services/physician.models';
import { getOperationalBillingProviderFailures, isOperationalBillingProvider } from './billing-provider-operational.util';

describe('billing-provider-operational.util', () => {
  const validOrg: PhysicianListItem = {
    phyID: 1,
    facilityId: 14,
    phyDateTimeCreated: '',
    phyFirstName: null,
    phyLastName: null,
    phyFullNameCC: 'IHP MI EMERGENCY MEDICINE PLLC',
    phyName: 'IHP MI EMERGENCY MEDICINE PLLC',
    phyType: 'Non-Person',
    phyRateClass: null,
    phyNPI: '1234567893',
    phySpecialtyCode: null,
    phyPrimaryCodeType: 'BI',
    phyAddress1: '100 Main St',
    phyCity: 'Detroit',
    phyState: 'MI',
    phyZip: '48201',
    phyTelephone: null,
    phyInactive: false,
    phyPrimaryIDCode: '123456789'
  };

  it('accepts complete Non-Person BI org', () => {
    expect(isOperationalBillingProvider(validOrg)).toBe(true);
    expect(getOperationalBillingProviderFailures(validOrg)).toEqual([]);
  });

  it('reports missing tax id', () => {
    const failures = getOperationalBillingProviderFailures({ ...validOrg, phyPrimaryIDCode: null });
    expect(failures.some((f) => f.includes('Tax ID'))).toBe(true);
  });
});
