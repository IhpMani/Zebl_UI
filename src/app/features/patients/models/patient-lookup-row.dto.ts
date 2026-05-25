/** Lightweight lookup grid row — not a full Patient aggregate. */
export interface PatientLookupRowDto {
  patId: number;
  patientName: string;
  accountNo: string | null;
  mrn: string | null;
  dob: string | null;
  phone: string | null;
  primaryPayer: string | null;
  patientBalance: number | null;
  insuranceBalance: number | null;
  totalBalance: number | null;
  lastDos: string | null;
  openClaimCount: number | null;
  status: string;
}

export interface PatientLookupFiltersDto {
  searchText?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}
