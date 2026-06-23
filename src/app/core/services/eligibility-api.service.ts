import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EligibilityRequestResultDto {
  id: number;
  status: string;
  batchFileName?: string | null;
  controlNumber: string;
  providerNpi?: string | null;
  providerMode?: string | null;
  usedPayerOverride?: boolean;
}

export interface EligibilityStatusDto {
  id: number;
  patientId: number;
  payerId: number;
  subscriberId: string;
  controlNumber: string;
  status: string;
  lifecycleStatus?: string | null;
  createdAt: string;
  batchFileName?: string | null;
  eligibilityStatus?: string | null;
  errorMessage?: string | null;
  payerMessage?: string | null;
  rejectionCode?: string | null;
  rejectionReason?: string | null;
  raw271?: string | null;
  raw270?: string | null;
  transportMetadataJson?: string | null;
  payerName?: string | null;
  planName?: string | null;
  planDetails?: string | null;
  eligibilityStartDate?: string | null;
  eligibilityEndDate?: string | null;
  benefits?: EligibilityBenefitDto[] | null;
  structured271?: EligibilityStructured271Dto | null;
  presentation?: EligibilityPresentationDto | null;
  providerNpi?: string | null;
  providerMode?: string | null;
  usedPayerOverride?: boolean;
}

export interface EligibilityPreflightResultDto {
  valid: boolean;
  errors: string[];
  warnings: string[];
  serverReachable?: boolean | null;
}

/** Program Setup form snapshot sent with test-connection so unsaved UI values are tested. */
export interface EligibilityConnectionTestSettingsDto {
  vendor?: string | null;
  receiverId?: string | null;
  server?: string | null;
  username?: string | null;
  /** Use ******** to keep stored password */
  password?: string | null;
  uploadDirectory?: string | null;
  incomingDirectory?: string | null;
  processedDirectory?: string | null;
  quarantineDirectory?: string | null;
  gatewayDataFormat?: string | null;
}

export interface EligibilityConnectionTestRequestDto {
  patientId?: number | null;
  settings?: EligibilityConnectionTestSettingsDto | null;
}

export interface EligibilityConnectionTestResultDto {
  success: boolean;
  message: string;
  vendor?: string | null;
  receiverId?: string | null;
  server?: string | null;
  receiverValid: boolean;
  credentialsValid: boolean;
  directoriesValid: boolean;
  failureKind?: string | null;
  httpStatusCode?: number | null;
  authenticationOutcome?: string | null;
  aaaRejectCode?: string | null;
  payerMessage?: string | null;
  errors: string[];
  diagnostics: string[];
}

export interface EligibilityConfigurationStatusRequestDto {
  patientId?: number | null;
}

export interface EligibilityConfigurationStatusDto {
  vendor: string;
  receiverValid: boolean;
  credentialsValid: boolean;
  directoriesValid: boolean;
  credentialsStatusMessage?: string | null;
  payerEligibilityIdsPresent: boolean;
  payerCoveragePercent: number;
  providerResolutionStatus?: string | null;
  pollingHealthy: boolean;
  lastSuccessful270UploadAt?: string | null;
  lastSuccessful271RetrievalAt?: string | null;
}

export interface EligibilityBenefitDto {
  serviceType?: string | null;
  benefit?: string | null;
  amount?: string | null;
  description?: string | null;
}

export interface EligibilityStructured271Dto {
  summary?: EligibilitySummaryDto | null;
  benefits?: BenefitEntryDto[] | null;
  vendorContacts?: VendorContactDto[] | null;
  primaryCareProvider?: PrimaryCareProviderDto | null;
  globalMessages?: string[] | null;
}

export interface EligibilitySummaryDto {
  coverageStatus?: string | null;
  planName?: string | null;
  groupName?: string | null;
  groupNumber?: string | null;
  planSponsor?: string | null;
  insuranceType?: string | null;
  coveragePeriod?: string | null;
  payerName?: string | null;
  subscriberName?: string | null;
  eligibilityStartDate?: string | null;
  eligibilityEndDate?: string | null;
}

export interface BenefitEntryDto {
  serviceType?: string | null;
  status?: string | null;
  network?: string | null;
  timePeriod?: string | null;
  copay?: number | null;
  coinsurance?: number | null;
  deductible?: number | null;
  outOfPocket?: number | null;
  authorizationRequired?: boolean | null;
  placeOfService?: string | null;
  planDescription?: string | null;
  messages?: string[] | null;
}

export interface VendorContactDto {
  serviceType?: string | null;
  entityRole?: string | null;
  vendorName?: string | null;
  contactName?: string | null;
  phoneNumber?: string | null;
  faxNumber?: string | null;
  email?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  npi?: string | null;
}

export interface PrimaryCareProviderDto {
  name?: string | null;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  npi?: string | null;
}

export interface EligibilityPresentationDto {
  summary?: EligibilityPresentationSummaryDto | null;
  financialSummary?: EligibilityFinancialSummaryDto | null;
  benefitCards?: EligibilityBenefitCardDto[] | null;
  vendorContacts?: EligibilityVendorPresentationDto[] | null;
  primaryCareProvider?: PrimaryCareProviderDto | null;
  additionalNotes?: string[] | null;
}

export interface EligibilityPresentationSummaryDto {
  coverageStatus?: string | null;
  displayPlanName?: string | null;
  groupName?: string | null;
  groupNumber?: string | null;
  planSponsor?: string | null;
  insuranceType?: string | null;
  coverageDates?: string | null;
  payerName?: string | null;
}

export interface EligibilityFinancialSummaryDto {
  deductibles?: EligibilityAmountLineDto[] | null;
  outOfPocket?: EligibilityAmountLineDto[] | null;
}

export interface EligibilityAmountLineDto {
  label: string;
  amount: string;
}

export interface EligibilityBenefitCardDto {
  title: string;
  status?: string | null;
  lines?: EligibilityBenefitCardLineDto[] | null;
  bulletItems?: string[] | null;
  notes?: string[] | null;
}

export interface EligibilityBenefitCardLineDto {
  label: string;
  values: string[];
}

export interface EligibilityVendorPresentationDto {
  role: string;
  vendorName: string;
  phone?: string | null;
  contactName?: string | null;
}

export interface EligibilityPatientHistoryItemDto {
  inquiryId: number;
  status: string;
  eligibilityStatus?: string | null;
  payerName?: string | null;
  createdAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
  controlNumber?: string | null;
}

export interface PatientEligibilitySnapshotDto {
  displayStatus: string;
  displayStatusLabel: string;
  needsAttention: boolean;
  lastCheckAt?: string | null;
  eligibilityDate?: string | null;
  eligibilityEndDate?: string | null;
  payerName?: string | null;
  memberId?: string | null;
  planName?: string | null;
  providerNpi?: string | null;
  providerMode?: string | null;
  latestInquiryId?: number | null;
  inFlightInquiryId?: number | null;
  lifecycleStatus?: string | null;
  patInsEligStatus?: string | null;
  source: string;
  canView: boolean;
  canCheck: boolean;
}

@Injectable({ providedIn: 'root' })
export class EligibilityApiService {
  private baseUrl = `${environment.apiUrl}/api/eligibility`;

  constructor(private http: HttpClient) {}

  preflight(patientId?: number | null): Observable<EligibilityPreflightResultDto> {
    return this.http.post<EligibilityPreflightResultDto>(`${this.baseUrl}/preflight`, {
      patientId: patientId ?? null
    });
  }

  request(patientId: number, originatingScreen = 'patient-details'): Observable<EligibilityRequestResultDto> {
    return this.http.post<EligibilityRequestResultDto>(`${this.baseUrl}/request`, {
      patientId,
      originatingScreen
    });
  }

  getPatientHistory(patientId: number): Observable<EligibilityPatientHistoryItemDto[]> {
    return this.http.get<EligibilityPatientHistoryItemDto[]>(`${this.baseUrl}/patient/${patientId}/history`);
  }

  getPatientSnapshot(patientId: number): Observable<PatientEligibilitySnapshotDto> {
    return this.http.get<PatientEligibilitySnapshotDto>(`${this.baseUrl}/patient/${patientId}/snapshot`);
  }

  getById(requestId: number, includeRaw271 = false, includeRaw270 = false): Observable<EligibilityStatusDto> {
    return this.http.get<EligibilityStatusDto>(
      `${this.baseUrl}/${requestId}?includeRaw271=${includeRaw271}&includeRaw270=${includeRaw270}`
    );
  }

  testConnection(body?: EligibilityConnectionTestRequestDto): Observable<EligibilityConnectionTestResultDto> {
    return this.http.post<EligibilityConnectionTestResultDto>(`${this.baseUrl}/test-connection`, body ?? {});
  }

  configurationStatus(body?: EligibilityConfigurationStatusRequestDto): Observable<EligibilityConfigurationStatusDto> {
    const patientId = body?.patientId ?? null;
    if (patientId === null || patientId === undefined) {
      return this.http.get<EligibilityConfigurationStatusDto>(`${this.baseUrl}/configuration-status`);
    }
    return this.http.get<EligibilityConfigurationStatusDto>(`${this.baseUrl}/configuration-status?patientId=${patientId}`);
  }
}

