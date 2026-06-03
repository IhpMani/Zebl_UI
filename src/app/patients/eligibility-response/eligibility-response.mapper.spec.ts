import {
  buildBcbsNjActiveSamplePayload,
  buildEligibilityResponseViewModel,
  mapBenefitRows
} from './eligibility-response.mapper';

describe('eligibility-response.mapper', () => {
  const formatDate = (v: unknown) => (v ? String(v) : '');

  it('maps BCBS NJ active sample with readable benefit grid', () => {
    const vm = buildEligibilityResponseViewModel(buildBcbsNjActiveSamplePayload(), formatDate);
    expect(vm).not.toBeNull();
    expect(vm!.coverageKind).toBe('active');
    expect(vm!.coverageLabel).toBe('Active');
    expect(vm!.payerName).toBe('BCBS NEW JERSEY');
    expect(vm!.hasBenefits).toBe(true);

    const pt = vm!.benefitRows.find(r => r.serviceType.includes('Physical Therapy'));
    expect(pt).toBeDefined();
    expect(pt!.amount).toContain('$30');

    const mh = vm!.benefitRows.find(r => r.serviceType.includes('Mental Health'));
    expect(mh).toBeDefined();

    const er = vm!.benefitRows.find(r => r.serviceType.includes('Emergency'));
    expect(er).toBeDefined();
    expect(er!.amount).toContain('$150');

    const vision = vm!.benefitRows.find(r => r.serviceType.includes('Vision'));
    expect(vision).toBeDefined();
  });

  it('shows compact waiting message at Awaiting271', () => {
    const vm = buildEligibilityResponseViewModel(
      {
        isLoading: true,
        inquiryStatus: 'Awaiting271',
        status: 'Checking',
        payerName: 'BCBS NEW JERSEY'
      },
      formatDate
    );
    expect(vm!.isLoading).toBe(true);
    expect(vm!.coverageKind).toBe('processing');
    expect(vm!.hasBenefits).toBe(false);
    expect(vm!.waitingMessage).toBe('Waiting for payer response...');
    expect(vm!.benefitsEmptyTitle).toBe('');
    expect(vm!.benefitsEmptyHint).toBeNull();
  });

  it('shows short empty message after Completed with no rows', () => {
    const vm = buildEligibilityResponseViewModel(
      {
        isLoading: false,
        inquiryStatus: 'Completed',
        status: 'Active',
        benefits: []
      },
      formatDate
    );
    expect(vm!.benefitsEmptyTitle).toContain('No benefit details returned');
    expect(vm!.benefitsEmptyHint).toBeNull();
  });

  it('uses friendly summary for technical HTTP errors', () => {
    const vm = buildEligibilityResponseViewModel(
      {
        status: 'Queued',
        inquiryStatus: 'Queued',
        errorMessage: 'HTTP context is unavailable for tenant resolution.'
      },
      formatDate
    );
    expect(vm!.operationalSummary).not.toContain('HTTP context');
    expect(vm!.diagnostics.technicalError).toContain('HTTP context');
  });

  it('derives Active coverage and hides junk rows for legacy Unknown parse', () => {
    const vm = buildEligibilityResponseViewModel(
      {
        inquiryStatus: 'Completed',
        status: 'Unknown',
        planName: 'ACTIVE COVERAGE',
        payerName: 'BCBS NEW JERSEY',
        benefits: [
          { serviceType: 'A', benefit: '', amount: '', description: '' },
          { serviceType: 'B', benefit: '', amount: '', description: '' },
          { serviceType: '30', benefit: '1', amount: '', description: 'Active Coverage' },
          { serviceType: '98', benefit: 'B', amount: '25', description: 'Primary Care Visit' },
          { serviceType: 'AE', benefit: 'B', amount: '30', description: 'Physical Therapy' }
        ]
      },
      formatDate
    );
    expect(vm!.coverageKind).toBe('active');
    expect(vm!.coverageLabel).toBe('Active');
    expect(vm!.planType).toBe('—');
    expect(vm!.benefitRows.some(r => r.serviceType === 'A' || r.serviceType === 'B')).toBe(false);
    const pcp = vm!.benefitRows.find(r => r.description.includes('Primary Care'));
    expect(pcp?.amount).toContain('$25');
  });

  it('returns empty benefit messaging when no rows', () => {
    const vm = buildEligibilityResponseViewModel({ status: 'Active', benefits: [] }, formatDate);
    expect(vm!.hasBenefits).toBe(false);
    expect(mapBenefitRows([])).toEqual([]);
  });
});
