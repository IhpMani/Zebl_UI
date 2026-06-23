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
  raw270?: string | null;
  /** Per-inquiry transport observability snapshot (JSON string from the API). */
  transportMetadataJson?: string | null;
  planName?: string | null;
  planDetails?: string | null;
  eligibilityStartDate?: string | null;
  eligibilityEndDate?: string | null;
  benefits?: EligibilityBenefitRowPayload[] | null;
  structured271?: EligibilityStructured271Dto | null;
  presentation?: EligibilityPresentationDto | null;
  errorMessage?: string | null;
  payerMessage?: string | null;
  rejectionCode?: string | null;
  rejectionReason?: string | null;
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

export interface EligibilityStructured271Dto {
  summary?: EligibilitySummaryDto | null;
  benefits?: BenefitEntryDto[] | null;
  vendorContacts?: VendorContactDto[] | null;
  primaryCareProvider?: PrimaryCareProviderDto | null;
  globalMessages?: string[] | null;
}

export interface EligibilitySummaryDto {
  coverageStatus?: string | null;
  planName?: string | null;
  groupName?: string | null;
  groupNumber?: string | null;
  planSponsor?: string | null;
  insuranceType?: string | null;
  coveragePeriod?: string | null;
  payerName?: string | null;
  subscriberName?: string | null;
  eligibilityStartDate?: string | null;
  eligibilityEndDate?: string | null;
}

export interface BenefitEntryDto {
  serviceType?: string | null;
  serviceTypeCode?: string | null;
  status?: string | null;
  network?: string | null;
  timePeriod?: string | null;
  copay?: number | null;
  coinsurance?: number | null;
  deductible?: number | null;
  outOfPocket?: number | null;
  authorizationRequired?: boolean | null;
  placeOfService?: string | null;
  planDescription?: string | null;
  messages?: string[] | null;
}

export interface VendorContactDto {
  serviceType?: string | null;
  entityRole?: string | null;
  vendorName?: string | null;
  contactName?: string | null;
  phoneNumber?: string | null;
  faxNumber?: string | null;
  email?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  npi?: string | null;
}

export interface PrimaryCareProviderDto {
  name?: string | null;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  npi?: string | null;
}

export interface EligibilityBenefitSectionRow {
  serviceType: string;
  status: string;
  network: string;
  copay: string;
  authorizationRequired: string;
  notes: string;
  deductible: string;
  outOfPocket: string;
  timePeriod: string;
  placeOfService: string;
}

export interface EligibilityPresentationDto {
  summary?: EligibilityPresentationSummaryDto | null;
  financialSummary?: EligibilityFinancialSummaryDto | null;
  benefitCards?: EligibilityBenefitCardDto[] | null;
  vendorContacts?: EligibilityVendorPresentationDto[] | null;
  primaryCareProvider?: PrimaryCareProviderDto | null;
  additionalNotes?: string[] | null;
}

export interface EligibilityPresentationSummaryDto {
  coverageStatus?: string | null;
  displayPlanName?: string | null;
  groupName?: string | null;
  groupNumber?: string | null;
  planSponsor?: string | null;
  insuranceType?: string | null;
  coverageDates?: string | null;
  payerName?: string | null;
}

export interface EligibilityFinancialSummaryDto {
  deductibles?: EligibilityAmountLineDto[] | null;
  outOfPocket?: EligibilityAmountLineDto[] | null;
}

export interface EligibilityAmountLineDto {
  label: string;
  amount: string;
}

export interface EligibilityBenefitCardDto {
  title: string;
  status?: string | null;
  lines?: EligibilityBenefitCardLineDto[] | null;
  bulletItems?: string[] | null;
  notes?: string[] | null;
}

export interface EligibilityBenefitCardLineDto {
  label: string;
  values: string[];
}

export interface EligibilityVendorPresentationDto {
  role: string;
  vendorName: string;
  phone?: string | null;
  contactName?: string | null;
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
  hasStructuredBenefits: boolean;
  hasPresentation: boolean;
  eligibilitySummary: {
    coverageStatus: string;
    planName: string;
    displayPlanName: string;
    groupName: string;
    insuranceType: string;
    coverageDates: string;
    planSponsor: string;
    groupNumber: string;
  };
  financialSummary: {
    deductibles: EligibilityAmountLineDto[];
    outOfPocket: EligibilityAmountLineDto[];
    hasFinancialData: boolean;
  };
  benefitCards: EligibilityBenefitCardDto[];
  structuredBenefitRows: EligibilityBenefitSectionRow[];
  vendorContacts: VendorContactDto[];
  vendorPresentations: EligibilityVendorPresentationDto[];
  hasVendorContacts: boolean;
  primaryCareProvider: PrimaryCareProviderDto | null;
  hasPrimaryCareProvider: boolean;
  globalMessages: string[];
  additionalNotes: string[];
  hasAdditionalNotes: boolean;
  /** Primary message when benefit grid is empty. */
  benefitsEmptyTitle: string;
  /** Secondary hint; omitted when null. */
  benefitsEmptyHint: string | null;
  /** Payer AAA/MSG rejection summary when coverage is rejected. */
  rejectionSummary: string | null;
  showPayerOverrideWarning: boolean;
  diagnostics: {
    lifecycleStatus: string;
    batchFileName: string;
    rawStatusMessage: string;
    payerMessage: string;
    rejectionCode: string;
    rejectionReason: string;
    technicalError: string;
    providerNpi: string;
    providerMode: string;
    raw271Preview: string;
    raw270Preview: string;
    transport: EligibilityTransportView | null;
  };
}

export interface EligibilityTransportKeyValue {
  label: string;
  value: string;
}

export interface EligibilityTransportView {
  capturedAt: string;
  userId: string;
  gatewayUrl: string;
  httpMethod: string;
  httpStatus: string;
  requestedAt: string;
  respondedAt: string;
  durationMs: string;
  httpRequestBody: string;
  httpResponseBody: string;
  receiverLibrary: EligibilityTransportKeyValue[];
}
