/**
 * Resolves the claim id that must be submitted for the current UI context.
 * Prefers the active workspace tab, then the route-bound component id, then loaded claim.
 */
export function resolveSubmitClaimId(input: {
  activeTabClaimId: number | null;
  routeClaimId: number | null;
  loadedClaimId?: number | null;
}): number | null {
  const { activeTabClaimId, routeClaimId, loadedClaimId } = input;

  if (activeTabClaimId != null && routeClaimId != null && activeTabClaimId !== routeClaimId) {
    throw new Error(
      `Submit claim id mismatch: active tab claim ${activeTabClaimId} does not match route claim ${routeClaimId}.`
    );
  }

  if (activeTabClaimId != null && loadedClaimId != null && activeTabClaimId !== loadedClaimId) {
    throw new Error(
      `Submit claim id mismatch: active tab claim ${activeTabClaimId} does not match loaded claim ${loadedClaimId}.`
    );
  }

  const resolved = activeTabClaimId ?? routeClaimId ?? loadedClaimId ?? null;
  if (resolved == null || resolved <= 0) {
    return null;
  }
  return resolved;
}
