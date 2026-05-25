/** Resolve patient id from claim detail payload (nested patient or ClaPatFID). */
export function resolveClaimPatientId(
  claim: {
    patient?: { patID?: number | null } | null;
    claPatFID?: number | null;
  } | null | undefined
): number | null {
  if (!claim) return null;
  const nested = claim.patient?.patID;
  if (nested != null && Number(nested) > 0) return Number(nested);
  const fk = claim.claPatFID;
  if (fk != null && Number(fk) > 0) return Number(fk);
  return null;
}

export function resolveClaimPatientName(
  claim: {
    patient?: {
      patFirstName?: string | null;
      patLastName?: string | null;
      patFullNameCC?: string | null;
    } | null;
  } | null | undefined
): string | null {
  if (!claim?.patient) return null;
  const p = claim.patient;
  const full = (p.patFullNameCC ?? '').trim();
  if (full) return full;
  const composed = [p.patLastName, p.patFirstName].filter(Boolean).join(', ').trim();
  return composed || null;
}
