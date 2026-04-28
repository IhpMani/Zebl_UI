export interface ServiceListItem {
  srvID: number;
  srvClaFID: number | null;
  srvDateTimeCreated: string;
  srvDateTimeModified?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
  srvFromDate: string;
  srvToDate: string;
  srvProcedureCode: string | null;
  srvDesc: string | null;
  srvCharges: number;
  srvUnits: number | null;
  srvTotalBalanceCC: number | null;
  srvTotalAmtPaidCC: number | null;
  additionalColumns?: { [key: string]: any };
}

export interface ServicesApiResponse {
  data: ServiceListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
