export interface PatientEligibilitySnapshotDto {
  displayStatus: string;
  displayStatusLabel: string;
  needsAttention: boolean;
  lastCheckAt: string | null;
  eligibilityDate: string | null;
  eligibilityEndDate: string | null;
  payerName: string | null;
  memberId: string | null;
  planName: string | null;
  providerNpi: string | null;
  providerMode: string | null;
  latestInquiryId: number | null;
  inFlightInquiryId: number | null;
  lifecycleStatus: string | null;
  patInsEligStatus: string | null;
  source: string;
  canView: boolean;
  canCheck: boolean;
}
