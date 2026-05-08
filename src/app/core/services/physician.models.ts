export interface PhysicianListItem {
  phyID: number;
  facilityId: number;
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
  /** True when the row was synthesised by an automated import (HL7/EDI fallback). */
  isSystemPlaceholder?: boolean;
  /** Convenience flag derived from PhyType. True when the row represents an organisation/facility. */
  isFacility?: boolean;
  /** Convenience flag derived from PhyType. True when the row represents a human provider. */
  isPerson?: boolean;
  additionalColumns?: { [key: string]: any };
}

/**
 * Canonical 2-letter classification codes used by both the API
 * (`PhyPrimaryCodeType` column) and the client. These map 1:1 to the patient
 * physician dropdown slots:
 *   * BI → Billing Provider
 *   * RE → Rendering Provider
 *   * FA → Service Facility
 *   * RF → Referring Provider
 *   * OP → Ordering Provider
 *   * SU → Supervising Provider
 *   * AT → Attending Provider (institutional claims)
 *   * OT → Operating Provider (institutional claims)
 */
export type ProviderClassification = 'BI' | 'RE' | 'FA' | 'RF' | 'OP' | 'SU' | 'AT' | 'OT';

export interface PhysiciansApiResponse {
  data: PhysicianListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
