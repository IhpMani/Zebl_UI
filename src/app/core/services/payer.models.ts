export interface PayerListItem {
  payID: number;
  payDateTimeCreated: string;
  payDateTimeModified?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
  payCreatedUserName?: string | null;
  payLastUserName?: string | null;
  payCreatedComputerName?: string | null;
  payLastComputerName?: string | null;
  payName: string | null;
  payClassification: string | null;
  payClaimType: string;
  payExternalID: string | null;
  payAddr1: string | null;
  payAddr2?: string | null;
  payCity: string | null;
  payState: string | null;
  payZip: string | null;
  payPhoneNo: string | null;
  payEmail: string | null;
  payFaxNo?: string | null;
  payWebsite?: string | null;
  payInactive: boolean;
  paySubmissionMethod: string;
  payClaimFilingIndicator?: string | null;
  payInsTypeCode?: string | null;
  payNotes?: string | null;
  payOfficeNumber?: string | null;
  payPaymentMatchingKey?: string | null;
  payEligibilityPayerID?: string | null;
  payEligibilityPhyID?: number;
  payFollowUpDays?: number;
  payICDIndicator?: string | null;
  payForwardsClaims?: boolean;
  payBox1?: string | null;
  payAlwaysExportSupervisingProvider?: boolean;
  payExportAuthIn2400?: boolean;
  payExportBillingTaxonomy?: boolean;
  payExportOtherPayerOfficeNumber2330B?: boolean;
  payExportOriginalRefIn2330B?: boolean;
  payExportPatientAmtDueIn2430?: boolean;
  payExportPatientForPOS12?: boolean;
  payExportPaymentDateIn2330B?: boolean;
  payExportSSN?: boolean;
  payIgnoreRenderingProvider?: boolean;
  payPrintBox30?: boolean;
  payFormatDateBox14And15?: boolean;
  paySuppressWhenPrinting?: boolean;
  payTotalUndisbursedPaymentsTRIG?: number;
  payExportTrackedPRAdjs?: boolean;
  payUseTotalAppliedInBox29?: boolean;
  payNameWithInactiveCC?: string | null;
  payCityStateZipCC?: string | null;
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
  payForwardsClaims: boolean;
  payExportSSN: boolean;
  payExportAuthIn2400: boolean;
  payExportBillingTaxonomy: boolean;
  payExportPatientForPOS12: boolean;
  payExportPatientAmtDueIn2430: boolean;
  payExportPaymentDateIn2330B: boolean;
  payExportOriginalRefIn2330B: boolean;
  payExportOtherPayerOfficeNumber2330B: boolean;
  payIgnoreRenderingProvider: boolean;
  payAlwaysExportSupervisingProvider: boolean;
  payPrintBox30: boolean;
  payFormatDateBox14And15: boolean;
  paySuppressWhenPrinting: boolean;
  payExportTrackedPRAdjs: boolean;
  payUseTotalAppliedInBox29: boolean;
  payTotalUndisbursedPaymentsTRIG: number;
}
