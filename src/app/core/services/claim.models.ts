export interface ClaimListItem {
  claID: number;
  claStatus: string | null;
  claDateTimeCreated: string | null;
  claTotalChargeTRIG: number | null;
  claTotalAmtPaidCC: number | null;
  claTotalBalanceCC: number | null;
  claClassification: string | null;
  claPatFID: number;
  claAttendingPhyFID: number;
  claBillingPhyFID: number;
  claReferringPhyFID: number;
  claBillDate: string | null;
  claTypeOfBill: string | null;
  claAdmissionType: string | null;
  claPatientStatus: string | null;
  claDiagnosis1: string | null;
  claDiagnosis2: string | null;
  claDiagnosis3: string | null;
  claDiagnosis4: string | null;
  claFirstDateTRIG: string | null;
  claLastDateTRIG: string | null;
  additionalColumns?: { [key: string]: any }; // Additional columns from related tables
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ClaimsApiResponse {
  data: ClaimListItem[];
  meta: PaginationMeta;
}

export interface Claim {
  claID: number;
  claStatus: string | null;
  claDateTimeCreated: string | null;
  claDateTimeModified: string | null;
  claTotalChargeTRIG: number | null;
  claTotalAmtPaidCC: number | null;
  claTotalBalanceCC: number | null;
  claTotalAmtAppliedCC: number | null;
  claBillDate: string | null;
  claBillTo: number | null;
  claSubmissionMethod: string | null;
  claLocked: boolean;
  claOriginalRefNo: string | null;
  claDelayCode: string | null;
  claPaperWorkTransmissionCode: string | null;
  claPaperWorkControlNumber: string | null;
  claEDINotes: string | null;
  claRemarks: string | null;
  claAdmittedDate: string | null;
  claDischargedDate: string | null;
  claDateLastSeen: string | null;
  claRelatedTo: number | null;
  claRelatedToState: string | null;
  claFirstDateTRIG: string | null;
  claLastDateTRIG: string | null;
  /** Facility - values from Libraries → List → Claim Classification */
  claClassification: string | null;

  // Diagnosis codes
  claDiagnosis1: string | null;
  claDiagnosis2: string | null;
  claDiagnosis3: string | null;
  claDiagnosis4: string | null;
  claDiagnosis5: string | null;
  claDiagnosis6: string | null;
  claDiagnosis7: string | null;
  claDiagnosis8: string | null;
  claDiagnosis9: string | null;
  claDiagnosis10: string | null;
  claDiagnosis11: string | null;
  claDiagnosis12: string | null;
  
  patient: {
    patID: number;
    patFirstName: string | null;
    patLastName: string | null;
    patFullNameCC: string | null;
    patBirthDate: string | null;
    patAccountNo: string | null;
    patPhoneNo: string | null;
    patCity: string | null;
    patState: string | null;
  } | null;
  
  renderingPhysician: {
    phyID: number;
    phyName: string | null;
    phyNPI: string | null;
  } | null;
  
  referringPhysician: {
    phyID: number;
    phyName: string | null;
    phyNPI: string | null;
  } | null;
  
  billingPhysician: {
    phyID: number;
    phyName: string | null;
    phyNPI: string | null;
  } | null;
  
  facilityPhysician: {
    phyID: number;
    phyName: string | null;
    phyNPI: string | null;
  } | null;
  
  serviceLines: Array<{
    srvID: number;
    srvFromDate: string | null;
    srvToDate: string | null;
    srvProcedureCode: string | null;
    srvDesc: string | null;
    srvCharges: number | null;
    srvUnits: number | null;
    srvPlace: string | null;
    srvDiagnosisPointer: string | null;
    srvTotalBalanceCC: number | null;
    srvTotalAmtPaidCC: number | null;
    srvTotalAdjCC: number | null;
    srvTotalAmtAppliedCC: number | null;
    srvResponsibleParty: number;
    responsiblePartyName: string | null;
    adjustments: Array<{
      adjID: number;
      adjDate: string | null;
      adjAmount: number;
      adjGroupCode: string | null;
      adjReasonCode: string | null;
      adjDateTimeCreated: string | null;
      payerName: string | null;
    }>;
    payments: Array<{
      pmtID: number;
      pmtDate: string | null;
      pmtAmount: number | null;
      pmtMethod: string | null;
      pmt835Ref: string | null;
      pmtDateTimeCreated: string | null;
    }>;
  }>;
}

