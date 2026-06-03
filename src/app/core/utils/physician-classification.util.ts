/** Mirrors backend PhysicianTaxonomy classification aliases (subset used for billing validation). */
const CLASSIFICATION_ALIASES: Record<string, string> = {
  billing: 'BI',
  billingprovider: 'BI',
  bi: 'BI',
  rendering: 'RE',
  re: 'RE',
  facility: 'FA',
  servicefacility: 'FA',
  'service facility': 'FA'
};

export function resolveProviderClassificationCode(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const alias = CLASSIFICATION_ALIASES[s.toLowerCase()];
  if (alias) return alias;
  if (s.length <= 2) return s.toUpperCase();
  return null;
}

export function isBillingClassificationCode(raw: string | null | undefined): boolean {
  if (!(raw ?? '').trim()) return true;
  const resolved = resolveProviderClassificationCode(raw);
  return resolved === 'BI';
}
