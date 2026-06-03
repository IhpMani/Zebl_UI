import { PhysicianListItem } from '../services/physician.models';
import { isBillingClassificationCode, resolveProviderClassificationCode } from './physician-classification.util';

const ENTITY_NON_PERSON = 'Non-Person';

/** Mirrors backend BillingProviderOperationalRules for pre-save UX. */
export function getOperationalBillingProviderFailures(
  provider: PhysicianListItem | null | undefined
): string[] {
  if (!provider) {
    return ['Billing provider not found in loaded physician list.'];
  }

  const failures: string[] = [];
  const label = (provider.phyFullNameCC || provider.phyName || `PhyID ${provider.phyID}`).trim();

  if (provider.isSystemPlaceholder) {
    failures.push('IsSystemPlaceholder = true (system placeholder cannot be used as billing provider)');
  }

  if ((provider.phyType || '').trim() !== ENTITY_NON_PERSON) {
    failures.push(`EntityType = ${formatVal(provider.phyType)} (expected ${ENTITY_NON_PERSON})`);
  }

  if (!isBillingClassificationCode(provider.phyPrimaryCodeType)) {
    const resolved = resolveProviderClassificationCode(provider.phyPrimaryCodeType);
    failures.push(
      `PhyPrimaryCodeType = ${formatVal(provider.phyPrimaryCodeType)} (resolved: ${formatVal(resolved)}) (expected BI or label "Billing")`
    );
  }

  if (!provider.phyAddress1?.trim()) failures.push('Missing Address1 (PhyAddress1)');
  if (!provider.phyCity?.trim()) failures.push('Missing City (PhyCity)');
  if (!provider.phyState?.trim()) failures.push('Missing State (PhyState)');
  if (!provider.phyZip?.trim()) failures.push('Missing Zip (PhyZip)');
  if (!provider.phyNPI?.trim()) failures.push('Missing NPI (PhyNPI)');
  if (!provider.phyPrimaryIDCode?.trim()) failures.push('Missing Tax ID (PhyPrimaryIDCode)');

  if (provider.phyInactive) {
    failures.push('PhyInactive = true (provider is marked inactive)');
  }

  return failures.length > 0
    ? [`Billing provider "${label}" is not ready for claim save:`, ...failures.map((f) => `  - ${f}`)]
    : [];
}

export function isOperationalBillingProvider(provider: PhysicianListItem | null | undefined): boolean {
  return getOperationalBillingProviderFailures(provider).length === 0;
}

export function formatBillingProviderValidationAlert(
  failures: string[],
  configureHint = 'Open Physician Library → select the billing organization → set Entity Type = Non-Person, Classification = Billing, and complete Address, NPI, and Tax ID.'
): string {
  if (!failures.length) return '';
  return `${failures.join('\n')}\n\n${configureHint}`;
}

function formatVal(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s ? s : '(blank)';
}
