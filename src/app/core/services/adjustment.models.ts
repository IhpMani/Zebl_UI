export interface AdjustmentListItem {
  adjID: number;
  adjDateTimeCreated: string;
  adjDate: string | null;
  adjAmount: number;
  adjGroupCode: string;
  adjReasonCode: string | null;
  adjSrvFID: number;
  adjPmtFID: number;
  adjPayFID: number;
  adj835Ref: string | null;
  additionalColumns?: { [key: string]: any };
}

export interface AdjustmentsApiResponse {
  data: AdjustmentListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
