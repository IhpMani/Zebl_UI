/** Raw payload assembled by patient-details (API + patient context). */
export interface EligibilityResponsePayload {
  inquiryId?: number | null;
  /** True while inquiry is in-flight (queued through awaiting 271). */
  isLoading?: boolean;
  /** Client session exceeded soft/hard timeout waiting for terminal status. */
  pollTimedOut?: boolean;
  payerName?: string | null;
  /** Coverage / eligibility status (Active, Inactive, etc.). */
  status?: string | null;
  inquiryStatus?: string | null;
  createdAt?: string | null;
  controlNumber?: string | null;
  batchFileName?: string | null;
  raw271?: string | null;
  planName?: string | null;
  planDetails?: string | null;
  eligibilityStartDate?: string | null;
  eligibilityEndDate?: string | null;
  benefits?: EligibilityBenefitRowPayload[] | null;
  errorMessage?: string | null;
  providerNpi?: string | null;
  providerMode?: string | null;
  usedPayerOverride?: boolean;
  patientName?: string | null;
  patientDob?: string | null;
  patientGender?: string | null;
  memberId?: string | null;
  subscriberName?: string | null;
  patientAddress?: string | null;
}

export interface EligibilityBenefitRowPayload {
  serviceType?: string | null;
  benefit?: string | null;
  amount?: string | null;
  description?: string | null;
}

export type CoverageBadgeKind = 'active' | 'inactive' | 'partial' | 'error' | 'processing';

export interface EligibilityBenefitGridRow {
  serviceType: string;
  coverage: string;
  amount: string;
  description: string;
  coverageKind: CoverageBadgeKind;
}

export interface EligibilityResponseViewModel {
  isLoading: boolean;
  pollTimedOut: boolean;
  /** Single inline status while waiting for 271 (no banner copy). */
  waitingMessage: string | null;
  lifecycleLabel: string;
  coverageLabel: string;
  coverageKind: CoverageBadgeKind;
  /** Retained for diagnostics; not shown in primary layout. */
  operationalSummary: string;
  /** Patient name + address on one line (insured header). */
  insuredLine: string;
  payerName: string;
  planType: string;
  planDetails: string;
  subscriberName: string;
  patientName: string;
  patientDob: string;
  patientGender: string;
  memberId: string;
  patientAddress: string;
  eligibilityDateRange: string;
  inquiryDate: string;
  providerDisplay: string;
  controlNumber: string;
  benefitRows: EligibilityBenefitGridRow[];
  hasBenefits: boolean;
  /** Primary message when benefit grid is empty. */
  benefitsEmptyTitle: string;
  /** Secondary hint; omitted when null. */
  benefitsEmptyHint: string | null;
  showPayerOverrideWarning: boolean;
  diagnostics: {
    lifecycleStatus: string;
    batchFileName: string;
    rawStatusMessage: string;
    technicalError: string;
    providerNpi: string;
    providerMode: string;
    raw271Preview: string;
  };
}
