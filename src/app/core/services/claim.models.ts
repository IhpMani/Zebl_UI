export interface Claim {
  claID: string;
  claStatus: string;
  claTotalChargeTRIG: number;
  claTotalBalanceCC: number;
  claDateTimeCreated: string;
  // Add other claim properties as needed based on the backend API
}

export interface Meta {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T[];
  meta: Meta;
}

