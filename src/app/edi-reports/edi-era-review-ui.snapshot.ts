/** Persisted when drilling into a claim so returning restores table UI without refetching review. */
export interface Era835ReviewUiSnapshot {
  version: 1;
  page: number;
  pageSize: number;
  filterUnmatched: boolean;
  filterApplied: boolean;
  filterDuplicates: boolean;
  filterReversals: boolean;
  filterPayer: string;
  filterPatient: string;
  filterClaimId: string;
  filterCpt: string;
  filterDos: string;
  filterAdj: string;
  expandedClaimIds: string[];
  expandedServiceLineKeys?: string[];
  scrollTop: number;
}
