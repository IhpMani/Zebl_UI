export interface PayerListItem {
  payID: number;
  payDateTimeCreated: string;
  payName: string | null;
  payClassification: string | null;
  payClaimType: string;
  payExternalID: string | null;
  payAddr1: string | null;
  payCity: string | null;
  payState: string | null;
  payZip: string | null;
  payPhoneNo: string | null;
  payEmail: string | null;
  payInactive: boolean;
  paySubmissionMethod: string;
  additionalColumns?: { [key: string]: any };
}

export interface PayersApiResponse {
  data: PayerListItem[];
  totalCount: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}

/** Full payer for library form (GET by id, create, update). */
export interface PayerDetailDto {
  payID: number;
  payDateTimeCreated?: string;
  payDateTimeModified?: string;
  payName: string | null;
  payExternalID: string | null;
  payAddr1: string | null;
  payAddr2: string | null;
  payBox1: string | null;
  payCity: string | null;
  payState: string | null;
  payZip: string | null;
  payPhoneNo: string | null;
  payEmail: string | null;
  payFaxNo: string | null;
  payWebsite: string | null;
  payNotes: string | null;
  payOfficeNumber: string | null;
  paySubmissionMethod: string;
  payClaimFilingIndicator: string | null;
  payClaimType: string;
  payInsTypeCode: string | null;
  payClassification: string | null;
  payPaymentMatchingKey: string | null;
  payEligibilityPayerID: string | null;
  payEligibilityPhyID: number;
  payFollowUpDays: number;
  payICDIndicator: string | null;
  payInactive: boolean;
  payIgnoreRenderingProvider: boolean;
  payForwardsClaims: boolean;
  payExportAuthIn2400: boolean;
  payExportSSN: boolean;
  payExportOriginalRefIn2330B: boolean;
  payExportPaymentDateIn2330B: boolean;
  payExportPatientAmtDueIn2430: boolean;
  payUseTotalAppliedInBox29: boolean;
  payPrintBox30: boolean;
  paySuppressWhenPrinting: boolean;
}
