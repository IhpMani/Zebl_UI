export interface PhysicianListItem {
  phyID: number;
  phyDateTimeCreated: string;
  phyFirstName: string | null;
  phyLastName: string | null;
  phyFullNameCC: string | null;
  phyName?: string | null;
  phyPrimaryCodeType?: string | null;
  phyNPI: string | null;
  phyType: string;
  phyInactive: boolean;
  phyCity: string | null;
  phyState: string | null;
  phyTelephone: string | null;
  additionalColumns?: { [key: string]: any };
}

export interface PhysiciansApiResponse {
  data: PhysicianListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
