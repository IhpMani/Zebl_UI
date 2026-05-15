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

export interface Era835ReviewMatchingDto {
  matchedClaimId?: number | null;
  matchedServiceLineId?: number | null;
  matchingStrategy: string;
  unmatchedReason?: string | null;
  creditsNote?: string | null;
}

export interface Era835ReviewCasDto {
  groupCode?: string | null;
  reasonCode?: string | null;
  amount?: number | null;
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
  patientName?: string | null;
  procedureCode: string;
  procedureCompositeRaw?: string | null;
  serviceDate?: string | null;
  chargeAmount?: number | null;
  paidAmount: number;
  remainingInsuranceBalance?: number | null;
  coAmount?: number | null;
  oaAmount?: number | null;
  piAmount?: number | null;
  prAmount?: number | null;
  adjustmentCodes: string;
  traceNumber: string;
  payerId835: string;
  autoApplyStatus: string;
  matchingConfidence: string;
  appliedTimestampUtc?: string | null;
  claimPaymentId?: number | null;
  insuranceAppliedAmount?: number | null;
  patientResponsibilityPosted?: number | null;
  matching: Era835ReviewMatchingDto;
  lineCas: Era835ReviewCasDto[];
  remarkCodes: string[];
}

export interface Era835ReviewClaimContextDto {
  claimExternalId: string;
  matchedClaimId?: number | null;
  claimInvoiceNumber?: string | null;
  claimStatus835?: string | null;
  patientName?: string | null;
  totalClaimCharge835?: number | null;
  claimPayment835?: number | null;
  patientResponsibility835?: number | null;
  claimLevelCas: Era835ReviewCasDto[];
  serviceLines: {
    lineIndex: number;
    procedureCompositeRaw?: string | null;
    procedureCodeNormalized: string;
    serviceDate?: string | null;
    chargeAmount?: number | null;
    paidAmount?: number | null;
    cas: Era835ReviewCasDto[];
  }[];
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

  apply(reportId: string): Observable<EdiApplyResponseDto> {
    return this.http.post<EdiApplyResponseDto>(`${this.baseUrl}/${reportId}/apply`, {});
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
    if (opts?.claimId?.trim()) p['claimId'] = opts.claimId.trim();
    if (opts?.cpt?.trim()) p['cpt'] = opts.cpt.trim();
    if (opts?.dos?.trim()) p['dos'] = opts.dos.trim();
    if (opts?.adjustmentCode?.trim()) p['adjustmentCode'] = opts.adjustmentCode.trim();
    return this.http.get<Era835ReviewResponseDto>(`${this.baseUrl}/${reportId}/review`, { params: p });
  }
}
