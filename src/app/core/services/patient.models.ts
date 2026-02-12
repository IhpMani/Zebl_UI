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
