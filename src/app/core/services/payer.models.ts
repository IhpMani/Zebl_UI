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
