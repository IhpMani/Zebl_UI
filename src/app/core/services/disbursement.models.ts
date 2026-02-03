export interface DisbursementListItem {
  disbID: number;
  disbDateTimeCreated: string;
  disbAmount: number;
  disbPmtFID: number;
  disbSrvFID: number;
  disbCode: string | null;
  disbNote: string | null;
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
