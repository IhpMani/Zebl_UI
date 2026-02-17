export interface InsuranceInfo {
  patInsGUID: string;
  patInsSequence: number;
  payID: number;
  payerName: string | null;
  insGroupNumber: string | null;
  insIDNumber: string | null;
  insFirstName: string | null;
  insLastName: string | null;
  insMI: string | null;
  insPlanName: string | null;
  patInsRelationToInsured: number;
  insBirthDate: string | null;
  insAddress: string | null;
  insCity: string | null;
  insState: string | null;
  insZip: string | null;
  insPhone: string | null;
  insEmployer: string | null;
  insAcceptAssignment?: number;
  insClaimFilingIndicator: string | null;
  insSSN: string | null;
  patInsEligStatus: string | null;
  /** UI-only: no DB column. Defaults true when record exists. */
  patInsActive?: boolean;
  /** UI-only: no DB column. */
  patInsLocked?: boolean;
}

export interface PhysicianAssignment {
  phyID: number;
  phyName: string | null;
  phyEntityType: string | null;
}

export interface PatientNote {
  date: string;
  user: string | null;
  noteText: string | null;
  claID: number;
}

export interface PatientDetail {
  patID: number;
  patFirstName: string | null;
  patLastName: string | null;
  patMI: string | null;
  patFullNameCC: string | null;
  patAccountNo: string | null;
  patActive: boolean;
  patBirthDate: string | null;
  patSSN: string | null;
  patSex: string | null;
  patAddress: string | null;
  patAddress2: string | null;
  patCity: string | null;
  patState: string | null;
  patZip: string | null;
  patPhoneNo: string | null;
  patCellPhoneNo: string | null;
  patHomePhoneNo: string | null;
  patWorkPhoneNo: string | null;
  patFaxNo: string | null;
  patPriEmail: string | null;
  patSecEmail: string | null;
  patClassification: string | null;
  patClaLibFID: number;
  patCoPayAmount: number | null;
  patDiagnosis1: string | null;
  patDiagnosis2: string | null;
  patDiagnosis3: string | null;
  patDiagnosis4: string | null;
  patEmployed: number | null;
  patMarried: number | null;
  patRenderingPhyFID: number;
  patBillingPhyFID: number;
  patFacilityPhyFID: number;
  patReferringPhyFID: number;
  patOrderingPhyFID: number;
  patSupervisingPhyFID: number;
  patStatementName: string | null;
  patStatementAddressLine1: string | null;
  patStatementAddressLine2: string | null;
  patStatementCity: string | null;
  patStatementState: string | null;
  patStatementZipCode: string | null;
  patStatementMessage: string | null;
  patReminderNote: string | null;
  patEmergencyContactName: string | null;
  patEmergencyContactPhoneNo: string | null;
  patEmergencyContactRelation: string | null;
  patWeight: string | null;
  patHeight: string | null;
  patMemberID: string | null;
  patSigOnFile: boolean;
  patInsuredSigOnFile: boolean;
  patPrintSigDate: boolean | null;
  patPhyPrintDate: boolean | null;
  patDontSendPromotions: boolean;
  patDontSendStatements: boolean;
  patAuthTracking: boolean | null;
  patAptReminderPref: string | null;
  patReminderNoteEvent: string | null;
  patSigSource: string | null;
  patCoPayPercent: number | null;
  patCustomField1: string | null;
  patCustomField2: string | null;
  patCustomField3: string | null;
  patCustomField4: string | null;
  patCustomField5: string | null;
  patExternalFID: string | null;
  patPaymentMatchingKey: string | null;
  patLastStatementDateTRIG: string | null;
  patTotalBalanceCC: number | null;
  patDateTimeCreated: string;
  patDateTimeModified: string;
  primaryInsurance: InsuranceInfo | null;
  secondaryInsurance: InsuranceInfo | null;
  insuranceList?: InsuranceInfo[];
  renderingPhysician: PhysicianAssignment | null;
  billingPhysician: PhysicianAssignment | null;
  facilityPhysician: PhysicianAssignment | null;
  referringPhysician: PhysicianAssignment | null;
  orderingPhysician: PhysicianAssignment | null;
  supervisingPhysician: PhysicianAssignment | null;
  patientNotes: PatientNote[];
}

export interface InsuranceUpdate {
  patInsGUID?: string | null;
  sequence: number;
  payID?: number | null;
  groupNumber?: string | null;
  memberID?: string | null;
  insFirstName?: string | null;
  insLastName?: string | null;
  insMI?: string | null;
  planName?: string | null;
  relationToInsured: number;
  insBirthDate?: string | null;
  insAddress?: string | null;
  insCity?: string | null;
  insState?: string | null;
  insZip?: string | null;
  insPhone?: string | null;
  insEmployer?: string | null;
  insAcceptAssignment?: number | null;
  insClaimFilingIndicator?: string | null;
  insSSN?: string | null;
}

export interface UpdatePatientRequest {
  patFirstName?: string | null;
  patLastName?: string | null;
  patMI?: string | null;
  patAccountNo?: string | null;
  patActive?: boolean | null;
  patBirthDate?: string | null;
  patSSN?: string | null;
  patSex?: string | null;
  patAddress?: string | null;
  patAddress2?: string | null;
  patCity?: string | null;
  patState?: string | null;
  patZip?: string | null;
  patPhoneNo?: string | null;
  patCellPhoneNo?: string | null;
  patHomePhoneNo?: string | null;
  patWorkPhoneNo?: string | null;
  patFaxNo?: string | null;
  patPriEmail?: string | null;
  patSecEmail?: string | null;
  patClassification?: string | null;
  patClaLibFID?: number | null;
  patCoPayAmount?: number | null;
  patDiagnosis1?: string | null;
  patDiagnosis2?: string | null;
  patDiagnosis3?: string | null;
  patDiagnosis4?: string | null;
  patEmployed?: number | null;
  patMarried?: number | null;
  patRenderingPhyFID?: number | null;
  patBillingPhyFID?: number | null;
  patFacilityPhyFID?: number | null;
  patReferringPhyFID?: number | null;
  patOrderingPhyFID?: number | null;
  patSupervisingPhyFID?: number | null;
  patStatementName?: string | null;
  patStatementAddressLine1?: string | null;
  patStatementAddressLine2?: string | null;
  patStatementCity?: string | null;
  patStatementState?: string | null;
  patStatementZipCode?: string | null;
  patStatementMessage?: string | null;
  patReminderNote?: string | null;
  patEmergencyContactName?: string | null;
  patEmergencyContactPhoneNo?: string | null;
  patEmergencyContactRelation?: string | null;
  patWeight?: string | null;
  patHeight?: string | null;
  patMemberID?: string | null;
  patSigOnFile?: boolean | null;
  patInsuredSigOnFile?: boolean | null;
  patPrintSigDate?: boolean | null;
  patPhyPrintDate?: boolean | null;
  patDontSendPromotions?: boolean | null;
  patDontSendStatements?: boolean | null;
  patAuthTracking?: boolean | null;
  patAptReminderPref?: string | null;
  patReminderNoteEvent?: string | null;
  patSigSource?: string | null;
  patCoPayPercent?: number | null;
  patCustomField1?: string | null;
  patCustomField2?: string | null;
  patCustomField3?: string | null;
  patCustomField4?: string | null;
  patCustomField5?: string | null;
  patExternalFID?: string | null;
  patPaymentMatchingKey?: string | null;
  patLastStatementDateTRIG?: string | null;
  insuranceList?: InsuranceUpdate[] | null;
  noteText?: string | null;
  updateClaims?: boolean | null;
}

export interface PatientListItem {
  patID: number;
  patFirstName: string | null;
  patLastName: string | null;
  patFullNameCC: string | null;
  patDateTimeCreated: string;
  patActive: boolean;
  patAccountNo: string | null;
  patBirthDate: string | null;
  patSSN: string | null;
  patSex: string | null;
  patAddress: string | null;
  patCity: string | null;
  patState: string | null;
  patZip: string | null;
  patPhoneNo: string | null;
  patCellPhoneNo: string | null;
  patPriEmail: string | null;
  patBillingPhyFID: number;
  patClassification: string | null;
  patTotalBalanceCC: number | null;
  additionalColumns?: { [key: string]: any };
}

export interface PatientsApiResponse {
  data: PatientListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
