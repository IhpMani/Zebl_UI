import { resolveSubmitClaimId } from './claim-submit-id.util';

describe('resolveSubmitClaimId', () => {
  it('returns active tab claim when tab 622 is active (open 620 then 622 scenario)', () => {
    const id = resolveSubmitClaimId({
      activeTabClaimId: 622,
      routeClaimId: 622,
      loadedClaimId: 622
    });
    expect(id).toBe(622);
  });

  it('throws when active tab and route claim ids differ', () => {
    expect(() =>
      resolveSubmitClaimId({
        activeTabClaimId: 622,
        routeClaimId: 620,
        loadedClaimId: 622
      })
    ).toThrow(/active tab claim 622 does not match route claim 620/);
  });

  it('throws when active tab and loaded claim ids differ', () => {
    expect(() =>
      resolveSubmitClaimId({
        activeTabClaimId: 622,
        routeClaimId: 622,
        loadedClaimId: 620
      })
    ).toThrow(/active tab claim 622 does not match loaded claim 620/);
  });
});
