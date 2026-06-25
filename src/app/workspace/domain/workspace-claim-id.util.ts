import { WorkspaceTab } from './workspace-tab.model';

/** Numeric claim id from `/claims/{id}` (not find-claim, new, send). */
export function parseClaimIdFromRoute(route: string): number | null {
  const normalized = route.startsWith('/') ? route : `/${route ?? ''}`;
  const match = normalized.match(/^\/claims\/(\d+)(?:\/|$)/);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Prefer explicit tab claimId; fall back to parsing the tab route. */
export function resolveWorkspaceTabClaimId(tab: WorkspaceTab | null | undefined): number | null {
  if (!tab) return null;
  if (tab.claimId != null && tab.claimId > 0) return tab.claimId;
  return parseClaimIdFromRoute(tab.route);
}
