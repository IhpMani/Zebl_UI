/** One row per note from Claim_Audit + all claim list columns */
export interface ClaimNoteListItem {
  auditID: number;
  claID: number;
  activityDate: string;
  userName: string;
  noteText: string;
  totalCharge: number | null;
  insuranceBalance: number | null;
  patientBalance: number | null;
  patientName?: string | null;
  /** Claim list fields (claStatus, claClassification, etc.) */
  [key: string]: unknown;
  additionalColumns?: { [key: string]: unknown };
}

export interface ClaimNotesApiResponse {
  data: ClaimNoteListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
