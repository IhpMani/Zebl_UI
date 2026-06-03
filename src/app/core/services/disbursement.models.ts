export interface DisbursementListItem {
  disbID: number;
  disbDateTimeCreated: string;
  disbDateTimeModified: string;
  createdDate?: string | null;
  modifiedDate?: string | null;
  disbCreatedUserGUID?: string | null;
  disbLastUserGUID?: string | null;
  disbCreatedUserName?: string | null;
  disbLastUserName?: string | null;
  disbCreatedComputerName?: string | null;
  disbLastComputerName?: string | null;
  disbAmount: number;
  disbPmtFID: number;
  disbSrvFID: number;
  disbCode: string | null;
  disbNote: string | null;
  disbBatchOperationReference?: string | null;
  disbSrvGUID?: string | null;
  additionalColumns?: { [key: string]: any };
}

export interface DisbursementsApiResponse {
  data: DisbursementListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
