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
  srvPlace?: string | null;
  srvTotalBalanceCC: number | null;
  srvTotalAmtPaidCC: number | null;
  srvTotalAdjCC?: number | null;
  srvTotalOtherAdjCC?: number | null;
  srvTotalInsBalanceCC?: number | null;
  srvTotalPatBalanceCC?: number | null;
  srvTotalAmtAppliedCC?: number | null;
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
