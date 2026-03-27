/** UI + stored/API values (matches backend ClaimStatus / ClaimStatusCatalog). */
export interface ClaimStatusOption {
  label: string;
  value: string;
}

export const CLAIM_STATUS_OPTIONS: readonly ClaimStatusOption[] = [
  { label: 'On Hold', value: 'OnHold' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'RTS', value: 'RTS' },
  { label: 'Other', value: 'Other' }
];
