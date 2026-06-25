/**
 * Resolves checked grid rows into the claimIds array for POST /api/claims/send-batch.
 * Submit must never infer IDs from RTS filters or the full grid — only explicit checkbox selection.
 */
export function getCheckedClaimIdsForSendBatch(selected: ReadonlySet<number>): number[] {
  return Array.from(selected);
}

export function validateCheckedClaimsForSendBatch(selected: ReadonlySet<number>): string | null {
  if (selected.size === 0) {
    return 'Please select at least one claim.';
  }
  return null;
}
