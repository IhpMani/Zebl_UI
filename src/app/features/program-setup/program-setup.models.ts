/** Program Setup section identifiers (UI route state). */
export type ProgramSetupSectionId =
  | 'general'
  | 'patient'
  | 'patient-custom-fields'
  | 'claim'
  | 'claim-custom-fields'
  | 'sending-claims'
  | 'payment'
  | 'company'
  | 'patient-eligibility'
  | 'interface';

export interface PatientProgramSettings {
  automaticAccountNumber: boolean;
  nextAccountNumber: number;
  nextAccountPrefix: string;
  requireAccountNumbers: boolean;
  requireUniqueAccountNumbers: boolean;
  automaticPatientTemplateId: number | null;
  initialAcceptAssignment: boolean;
  source?: string;
}

export interface ClaimProgramSettings {
  initialClaimStatus: string;
  initialPlaceOfService: string;
  initialICDIndicator: string;
  lockClaimsAfterPrint: boolean;
  checkDuplicateServiceLines: boolean;
  validateICDLogic: boolean;
}

export interface CompanyProgramSettings {
  companyName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  taxId: string;
  npi: string;
}

export interface InterfaceProgramSettings {
  duplicateCheckFields: {
    serviceDate: boolean;
    procedureCode: boolean;
    productCode: boolean;
    modifiers: boolean;
    diagnosisPointer: boolean;
  };
  assignPatientDiagnosisCodes: boolean;
}

/** Fields persisted in SendingClaimsSettings table (tenant/facility scoped). */
export interface SendingClaimsCoreSettings {
  showBillToPatientClaims: boolean;
  patientControlNumberMode: 'ClaimId' | 'PatientAccount';
  nextSubmissionNumber: number;
}

/** Extended UI fields persisted in ProgramSettings section "sendingClaims". */
export interface SendingClaimsExtendedSettings {
  defaultSubmitterReceiverId: string | null;
  exportFormat: string;
  autoMarkClaimsSent: boolean;
  lockClaimsAfterExport: boolean;
  exportBatchSize: number;
}

export type SendingClaimsProgramSettings = SendingClaimsCoreSettings & SendingClaimsExtendedSettings;

export interface PatientEligibilityProgramSettings {
  receiverId: string | null;
  vendor: string;
  providerMode: string;
  specificProviderId: number | null;
  username: string;
  password: string;
  server: string;
  uploadDirectory: string;
  incomingDirectory: string;
  processedDirectory: string;
  passwordConfigured: boolean;
  showEligibilityResponseViewer: boolean;
}
