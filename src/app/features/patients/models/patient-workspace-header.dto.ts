export interface PatientWorkspaceHeaderDto {
  patId: number;
  patientName: string;
  dob: string | null;
  ageYears: number | null;
  mrn: string | null;
  accountNo: string | null;
  addressLine: string | null;
  phone: string | null;
  primaryPayer: string | null;
  totalBalance: number | null;
  openClaimsCount: number | null;
  totalClaimsCount: number | null;
  closedClaimsCount: number | null;
  lastDos: string | null;
  patActive: boolean;
  sex: string | null;
  email: string | null;
}
