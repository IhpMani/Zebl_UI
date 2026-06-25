import { parseClaimIdFromRoute, resolveWorkspaceTabClaimId } from '../../workspace/domain/workspace-claim-id.util';
import { WorkspaceTab } from '../../workspace/domain/workspace-tab.model';

describe('workspace claim id', () => {
  it('parseClaimIdFromRoute returns id for claim detail routes', () => {
    expect(parseClaimIdFromRoute('/claims/622')).toBe(622);
    expect(parseClaimIdFromRoute('/claims/622/')).toBe(622);
    expect(parseClaimIdFromRoute('claims/620')).toBe(620);
  });

  it('parseClaimIdFromRoute ignores non-detail claim routes', () => {
    expect(parseClaimIdFromRoute('/claims/send')).toBeNull();
    expect(parseClaimIdFromRoute('/claims/find-claim')).toBeNull();
    expect(parseClaimIdFromRoute('/claims/new')).toBeNull();
  });

  it('resolveWorkspaceTabClaimId prefers explicit tab claimId', () => {
    const tab: WorkspaceTab = {
      id: 't1',
      title: 'Claim 622',
      route: '/claims/620',
      claimId: 622,
      tabType: 'claim',
      isActive: true,
      isDirty: false,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    expect(resolveWorkspaceTabClaimId(tab)).toBe(622);
  });

  it('resolveWorkspaceTabClaimId falls back to route when claimId missing', () => {
    const tab: WorkspaceTab = {
      id: 't2',
      title: 'Claim 622',
      route: '/claims/622',
      tabType: 'claim',
      isActive: true,
      isDirty: false,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    expect(resolveWorkspaceTabClaimId(tab)).toBe(622);
  });
});
