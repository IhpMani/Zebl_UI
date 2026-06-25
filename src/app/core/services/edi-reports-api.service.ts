import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EdiGenerateResponseDto {
  status: string;
  correlationId?: string;
  reportId: string;
  fileName: string;
  fileType: string;
  reportStatus: string;
  fileSize: number;
  isDuplicate: boolean;
}

export interface EdiApplyResponseDto {
  processed: number;
  applied: number;
  skipped?: number;
  duplicatesSkipped: number;
  unmatched: number;
  reversed?: number;
  invalid?: number;
  creditsCreated?: number;
  correlationId?: string;
}

export interface EdiReverseResponseDto {
  reversed: number;
  skipped: number;
  alreadyReversed: number;
  correlationId?: string;
}

export interface Era835MatchFactorDto {
  factor: string;
  matched: boolean;
  detail?: string | null;
}

export interface Era835MatchCandidateDto {
  claimId: number;
  confidenceScore: number;
  strategy: string;
}

export interface Era835ReviewMatchingDto {
  matchedClaimId?: number | null;
  matchedServiceLineId?: number | null;
  matchingStrategy: string;
  unmatchedReason?: string | null;
  creditsNote?: string | null;
  confidenceExplanation?: string | null;
  confidenceScore?: number | null;
  matchFactors?: Era835MatchFactorDto[];
  failureReasons?: string[];
  alternatives?: Era835MatchCandidateDto[];
}

export interface Era835ReviewCasTotalsDto {
  co: number;
  oa: number;
  pi: number;
  pr: number;
}

export interface Era835ReviewCasDto {
  key?: string;
  groupCode?: string | null;
  reasonCode?: string | null;
  amount?: number | null;
  description?: string | null;
  scope?: string | null;
}

export interface Era835ReviewLineRowDto {
  lineKey: string;
  claimExternalId: string;
  lineIndexInClaim: number;
  status: string;
  statusCategory: string;
  matchedClaimId?: number | null;
  claimInvoiceNumber?: string | null;
  claimStatus?: string | null;
  internalClaimStatus?: string | null;
  claimBalance?: number | null;
  patientName?: string | null;
  procedureCode: string;
  procedureCompositeRaw?: string | null;
  serviceDate?: string | null;
  chargeAmount?: number | null;
  paidAmount: number;
  remainingInsuranceBalance?: number | null;
  serviceLineBalance?: number | null;
  coAmount?: number | null;
  oaAmount?: number | null;
  piAmount?: number | null;
  prAmount?: number | null;
  adjustmentCodes: string;
  traceNumber: string;
  payerId835: string;
  autoApplyStatus: string;
  matchingConfidence: string;
  confidenceScore?: number | null;
  confidenceExplanation?: string | null;
  appliedTimestampUtc?: string | null;
  claimPaymentId?: number | null;
  insuranceAppliedAmount?: number | null;
  projectedInsuranceCredit?: number | null;
  insuranceCreditAvailable?: number | null;
  patientCreditAvailable?: number | null;
  patientResponsibilityPosted?: number | null;
  matching: Era835ReviewMatchingDto;
  lineCas: Era835ReviewCasDto[];
  claimLevelCas?: Era835ReviewCasDto[];
  serviceLineCas?: Era835ReviewCasDto[];
  casTotals?: Era835ReviewCasTotalsDto;
  remarkCodes: string[];
}

export interface Era835ReviewDisbursementLineDto {
  serviceLineId: number;
  procedureCode: string;
  serviceDate?: string | null;
  chargeAmount: number;
  openBalance: number;
  defaultApply: boolean;
  defaultAmount: number;
  isAutoMatch: boolean;
}

export interface Era835ReviewDisbursementPlanDto {
  paymentAmount835: number;
  isZeroPayInformational: boolean;
  lines: Era835ReviewDisbursementLineDto[];
}

export interface Era835ReviewCreditDto {
  id: number;
  claimId: number;
  patientId: number;
  creditType: string;
  originalAmount: number;
  availableAmount: number;
  status: string;
  sourceReportId: string;
  traceNumber: string;
  lineIndexInClaim: number;
  serviceLineCode?: string | null;
  claimPaymentId?: number | null;
  createdAtUtc: string;
  isReversed: boolean;
}

export interface Era835ReviewCreditLedgerEntryDto {
  id: number;
  creditId: number;
  entryType: string;
  amount: number;
  targetClaimId?: number | null;
  targetServiceLineId?: number | null;
  notes?: string | null;
  createdAtUtc: string;
  createdBy?: string | null;
}

export interface Era835ReviewCreditSummaryDto {
  insuranceCreditAvailable: number;
  patientCreditAvailable: number;
  projectedInsuranceCredit: number;
  projectedPatientCredit: number;
  existingCredits: Era835ReviewCreditDto[];
  recentHistory?: Era835ReviewCreditLedgerEntryDto[];
}

export interface Era835ReviewClaimDisbursementDto {
  claimExternalId: string;
  allocations: Era835ReviewDisbursementAllocationDto[];
  insuranceCreditDisposition?: string;
  patientCreditDisposition?: string;
  manualClaimId?: number | null;
}

export interface Era835ReviewDisbursementAllocationDto {
  serviceLineId: number;
  applyDisbursement: boolean;
  amount: number;
}

export interface Era835ReviewApplyRequestDto {
  claims: Era835ReviewClaimDisbursementDto[];
  casDispositions?: Era835CasDispositionDto[];
}

export interface Era835CasDispositionDto {
  key: string;
  disposition: 'apply' | 'track' | 'ignore';
}

export interface Era835ReconciliationWarningDto {
  severity: string;
  code: string;
  message: string;
  expectedAmount?: number | null;
  actualAmount?: number | null;
}

export interface Era835AuditTrailEntryDto {
  occurredAtUtc: string;
  eventType: string;
  claimId?: number | null;
  claimExternalId?: string | null;
  userName?: string | null;
  notes?: string | null;
}

export interface Era835PostingHistoryEntryDto {
  claimPaymentId: number;
  claimExternalId: string;
  claimId?: number | null;
  lineIndexInClaim: number;
  serviceLineCode?: string | null;
  paidAmount: number;
  insuranceAppliedAmount: number;
  isApplied: boolean;
  isReversed: boolean;
  postedAtUtc?: string | null;
  postedBy?: string | null;
  traceNumber: string;
}

export interface Era835ReviewSvcLineDto {
  lineIndex: number;
  procedureCompositeRaw?: string | null;
  procedureCodeNormalized: string;
  serviceDate?: string | null;
  chargeAmount?: number | null;
  paidAmount?: number | null;
  matchedServiceLineId?: number | null;
  remainingInsuranceBalance?: number | null;
  serviceLineBalance?: number | null;
  cas: Era835ReviewCasDto[];
  casTotals?: Era835ReviewCasTotalsDto;
}

export interface Era835ReviewClaimContextDto {
  claimExternalId: string;
  matchedClaimId?: number | null;
  claimInvoiceNumber?: string | null;
  claimStatus835?: string | null;
  internalClaimStatus?: string | null;
  claimBalance?: number | null;
  patientName?: string | null;
  totalClaimCharge835?: number | null;
  claimPayment835?: number | null;
  patientResponsibility835?: number | null;
  matchingStrategy?: string | null;
  matchingConfidence?: string | null;
  confidenceExplanation?: string | null;
  unmatchedReason?: string | null;
  eraLineStatus?: string | null;
  claimLevelCas: Era835ReviewCasDto[];
  claimLevelCasTotals?: Era835ReviewCasTotalsDto;
  allCasTotals?: Era835ReviewCasTotalsDto;
  serviceLines: Era835ReviewSvcLineDto[];
  disbursementPlan?: Era835ReviewDisbursementPlanDto | null;
  creditSummary?: Era835ReviewCreditSummaryDto | null;
}

export interface Era835ReviewAdjustmentPanelRowDto {
  key: string;
  groupCode?: string | null;
  reasonCode?: string | null;
  description?: string | null;
  totalAmount: number;
  adjustmentType: string;
  applyIgnoreToggle: boolean;
}

export interface Era835ReviewResponseDto {
  report: {
    id: string;
    fileName: string;
    fileType: string;
    status: string;
    traceNumber?: string | null;
    createdAt: string;
    receivedAt?: string | null;
  };
  summary: {
    payerName835?: string | null;
    payerId835?: string | null;
    matchedInternalPayerId?: number | null;
    matchedInternalPayerName?: string | null;
    paymentMethodCode?: string | null;
    paymentMethodDescription?: string | null;
    traceNumber: string;
    paymentDateUtc?: string | null;
    totalPaymentAmount?: number | null;
    totalAppliedAmount: number;
    totalAdjustmentAmount: number;
    unmatchedLineCount: number;
    appliedLineCount: number;
    duplicateLineCount: number;
    reversalLineCount: number;
  };
  lines: Era835ReviewLineRowDto[];
  claimContexts: Era835ReviewClaimContextDto[];
  adjustmentPanel: Era835ReviewAdjustmentPanelRowDto[];
  reconciliation: {
    bpr02?: number | null;
    sumClpClaimPayments: number;
    sumFlattenedLinePaid: number;
    sumInsuranceAppliedFromRows: number;
    sumPatientResponsibility835: number;
    isBalanced?: boolean;
    warnings?: Era835ReconciliationWarningDto[];
  };
  totalLines: number;
  page: number;
  pageSize: number;
}

export interface EdiReportDto {
  id: string;
  receiverLibraryId?: string;
  connectionLibraryId?: string;
  fileName: string;
  fileType: string;
  direction: string;
  status: string;
  traceNumber?: string;
  claimIdentifier?: string;
  payerName?: string;
  paymentAmount?: number;
  note?: string;
  createdAt: string;
  sentAt?: string;
  receivedAt?: string;
  isArchived: boolean;
  isRead: boolean;
  fileSize: number;
  correlationId?: string;
  isDuplicate?: boolean;
}

export interface Era835ManualMatchRequestDto {
  claimExternalId: string;
  lineIndexInClaim: number;
  matchedClaimId: number;
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EdiReportsApiService {
  private baseUrl = `${environment.apiUrl}/api/edi-reports`;

  constructor(private http: HttpClient) {}

  getAll(archived?: boolean): Observable<EdiReportDto[]> {
    if (archived != null) {
      return this.http.get<EdiReportDto[]>(this.baseUrl, { params: { archived: String(archived) } });
    }
    return this.http.get<EdiReportDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<EdiReportDto> {
    return this.http.get<EdiReportDto>(`${this.baseUrl}/${id}`);
  }

  getContent(id: string, preview: boolean = false): Observable<string> {
    return this.http.get(`${this.baseUrl}/${id}/content`, { 
      params: preview ? { preview: 'true' } : {},
      responseType: 'text' 
    });
  }

  generate(request: { receiverLibraryId: string; claimId: number; connectionLibraryId?: string; fileType?: string }): Observable<EdiGenerateResponseDto> {
    return this.http.post<EdiGenerateResponseDto>(`${this.baseUrl}/generate`, {
      receiverLibraryId: request.receiverLibraryId,
      claimId: request.claimId,
      connectionLibraryId: request.connectionLibraryId || null,
      fileType: request.fileType || '837'
    });
  }

  download(connectionLibraryId: string, receiverLibraryId: string): Observable<{ count: number; skippedCount?: number; message?: string; reports: EdiReportDto[] }> {
    return this.http.post<{ count: number; skippedCount?: number; message?: string; reports: EdiReportDto[] }>(`${this.baseUrl}/download`, {
      connectionLibraryId,
      receiverLibraryId
    });
  }

  archive(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/archive/${id}`, {});
  }

  markAsRead(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/mark-read/${id}`, {});
  }

  updateNote(id: string, note: string | null): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${id}/note`, { note });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  exportFile(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/export`, { responseType: 'blob' });
  }

  apply(reportId: string, body?: Era835ReviewApplyRequestDto): Observable<EdiApplyResponseDto> {
    return this.http.post<EdiApplyResponseDto>(`${this.baseUrl}/${reportId}/apply`, body ?? {});
  }

  reverse(reportId: string): Observable<EdiReverseResponseDto> {
    return this.http.post<EdiReverseResponseDto>(`${this.baseUrl}/${reportId}/reverse`, {});
  }

  manualMatch(reportId: string, body: Era835ManualMatchRequestDto): Observable<{ success: boolean; correlationId?: string }> {
    return this.http.post<{ success: boolean; correlationId?: string }>(`${this.baseUrl}/${reportId}/manual-match`, body);
  }

  get835Review(
    reportId: string,
    opts?: {
      refresh?: boolean;
      page?: number;
      pageSize?: number;
      unmatchedOnly?: boolean;
      appliedOnly?: boolean;
      duplicatesOnly?: boolean;
      reversalsOnly?: boolean;
      payer?: string;
      patient?: string;
      claimId?: string;
      cpt?: string;
      dos?: string;
      adjustmentCode?: string;
    }
  ): Observable<Era835ReviewResponseDto> {
    const p: Record<string, string> = {};
    if (opts?.refresh) p['refresh'] = 'true';
    if (opts?.page != null) p['page'] = String(opts.page);
    if (opts?.pageSize != null) p['pageSize'] = String(opts.pageSize);
    if (opts?.unmatchedOnly) p['unmatchedOnly'] = 'true';
    if (opts?.appliedOnly) p['appliedOnly'] = 'true';
    if (opts?.duplicatesOnly) p['duplicatesOnly'] = 'true';
    if (opts?.reversalsOnly) p['reversalsOnly'] = 'true';
    if (opts?.payer?.trim()) p['payer'] = opts.payer.trim();
    if (opts?.patient?.trim()) p['patient'] = opts.patient.trim();
    if (opts?.claimId?.trim()) p['claimId'] = opts.claimId.trim();
    if (opts?.cpt?.trim()) p['cpt'] = opts.cpt.trim();
    if (opts?.dos?.trim()) p['dos'] = opts.dos.trim();
    if (opts?.adjustmentCode?.trim()) p['adjustmentCode'] = opts.adjustmentCode.trim();
    return this.http.get<Era835ReviewResponseDto>(`${this.baseUrl}/${reportId}/review`, { params: p });
  }

  get835AuditTrail(reportId: string): Observable<Era835AuditTrailEntryDto[]> {
    return this.http.get<Era835AuditTrailEntryDto[]>(`${this.baseUrl}/${reportId}/audit-trail`);
  }

  get835PostingHistory(reportId: string): Observable<Era835PostingHistoryEntryDto[]> {
    return this.http.get<Era835PostingHistoryEntryDto[]>(`${this.baseUrl}/${reportId}/posting-history`);
  }

  export835Review(
    reportId: string,
    opts?: {
      unmatchedOnly?: boolean;
      appliedOnly?: boolean;
      duplicatesOnly?: boolean;
      reversalsOnly?: boolean;
      payer?: string;
      patient?: string;
      claimId?: string;
      cpt?: string;
      dos?: string;
      adjustmentCode?: string;
    }
  ): Observable<Blob> {
    const p: Record<string, string> = {};
    if (opts?.unmatchedOnly) p['unmatchedOnly'] = 'true';
    if (opts?.appliedOnly) p['appliedOnly'] = 'true';
    if (opts?.duplicatesOnly) p['duplicatesOnly'] = 'true';
    if (opts?.reversalsOnly) p['reversalsOnly'] = 'true';
    if (opts?.payer?.trim()) p['payer'] = opts.payer.trim();
    if (opts?.patient?.trim()) p['patient'] = opts.patient.trim();
    if (opts?.claimId?.trim()) p['claimId'] = opts.claimId.trim();
    if (opts?.cpt?.trim()) p['cpt'] = opts.cpt.trim();
    if (opts?.dos?.trim()) p['dos'] = opts.dos.trim();
    if (opts?.adjustmentCode?.trim()) p['adjustmentCode'] = opts.adjustmentCode.trim();
    return this.http.get(`${this.baseUrl}/${reportId}/review-export`, { params: p, responseType: 'blob' });
  }

  export835Reconciliation(reportId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${reportId}/reconciliation-export`, { responseType: 'blob' });
  }
}
