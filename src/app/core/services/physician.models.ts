export interface PhysicianListItem {
  phyID: number;
  phyDateTimeCreated: string;
  phyFirstName: string | null;
  phyLastName: string | null;
  phyFullNameCC: string | null;
  phyName?: string | null;
  phyType: string;
  phyRateClass: string | null;
  phyNPI: string | null;
  phySpecialtyCode: string | null;
  phyPrimaryCodeType?: string | null;
  phyAddress1: string | null;
  phyCity: string | null;
  phyState: string | null;
  phyZip: string | null;
  phyTelephone: string | null;
  phyInactive: boolean;
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
