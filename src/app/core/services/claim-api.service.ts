import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ClaimBatchDetail,
  ClaimBatchItemDto,
  ClaimBatchListItem,
  ClaimsApiResponse,
  Claim,
  ClaimListItem,
  PaginationMeta,
  UserKpiDashboard
} from './claim.models';
import { environment } from 'src/environments/environment';

function pickFirstDefined(...vals: unknown[]): unknown {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return undefined;
}

/** Coerce API date/time payloads (string, epoch, BSON-style) to ISO string for list cells. */
function coerceClaimListDateField(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length ? t : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'object' && value !== null && '$date' in (value as Record<string, unknown>)) {
    return coerceClaimListDateField((value as { $date?: unknown }).$date);
  }
  return null;
}

function normalizeClaimListRow(row: unknown): ClaimListItem {
  if (row == null || typeof row !== 'object') {
    return row as ClaimListItem;
  }
  const o = { ...(row as Record<string, unknown>) } as Record<string, unknown>;
  const get = (camel: string, pascal: string): unknown =>
    pickFirstDefined(o[camel] as unknown, o[pascal] as unknown);

  const created = pickFirstDefined(
    get('claDateTimeCreated', 'ClaDateTimeCreated'),
    get('claCreatedTimestamp', 'ClaCreatedTimestamp')
  );
  const modified = pickFirstDefined(
    get('claDateTimeModified', 'ClaDateTimeModified'),
    get('claModifiedTimestamp', 'ClaModifiedTimestamp')
  );
  const cStr = coerceClaimListDateField(created);
  const mStr = coerceClaimListDateField(modified);
  if (cStr != null) o['claDateTimeCreated'] = cStr;
  if (mStr != null) o['claDateTimeModified'] = mStr;
  if (cStr != null) o['createdDate'] = cStr;
  if (mStr != null) o['modifiedDate'] = mStr;

  const add = o['additionalColumns'] ?? o['AdditionalColumns'];
  if (add != null && typeof add === 'object') {
    o['additionalColumns'] = add;
  }
  return o as unknown as ClaimListItem;
}

function normalizePaginationMeta(raw: unknown): PaginationMeta | null {
  if (raw == null || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const page = m['page'] ?? m['Page'];
  const pageSize = m['pageSize'] ?? m['PageSize'];
  const totalCount = m['totalCount'] ?? m['TotalCount'];
  if (
    typeof page === 'number' &&
    typeof pageSize === 'number' &&
    typeof totalCount === 'number'
  ) {
    return { page, pageSize, totalCount };
  }
  return null;
}

function normalizeClaimsApiResponse(raw: unknown): ClaimsApiResponse {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') {
    return { data: [], meta: { page: 1, pageSize: 25, totalCount: 0 } };
  }
  const topData = r['data'] ?? r['Data'];
  let rows: unknown[] = [];
  if (Array.isArray(topData)) {
    rows = topData;
  } else if (topData != null && typeof topData === 'object') {
    const inner = (topData as Record<string, unknown>)['data'] ?? (topData as Record<string, unknown>)['Data'];
    if (Array.isArray(inner)) {
      rows = inner;
    }
  }
  const metaRaw = r['meta'] ?? r['Meta'] ?? null;
  const meta =
    normalizePaginationMeta(metaRaw) ??
    (topData != null && typeof topData === 'object'
      ? normalizePaginationMeta((topData as Record<string, unknown>)['meta'] ?? (topData as Record<string, unknown>)['Meta'])
      : null) ?? { page: 1, pageSize: 25, totalCount: 0 };

  return {
    data: rows.map(normalizeClaimListRow),
    meta
  };
}

function normalizeBatchListItem(raw: unknown): ClaimBatchListItem {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      status: '',
      totalClaims: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: ''
    };
  }
  const o = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  return {
    id: String(pickFirstDefined(o['id'], o['Id']) ?? ''),
    status: String(pickFirstDefined(o['status'], o['Status']) ?? ''),
    submitterReceiverId: (pickFirstDefined(o['submitterReceiverId'], o['SubmitterReceiverId']) as string | null) ?? null,
    connectionType: (pickFirstDefined(o['connectionType'], o['ConnectionType']) as string | null) ?? null,
    totalClaims: num(pickFirstDefined(o['totalClaims'], o['TotalClaims'])),
    successCount: num(pickFirstDefined(o['successCount'], o['SuccessCount'])),
    failureCount: num(pickFirstDefined(o['failureCount'], o['FailureCount'])),
    createdAt: String(pickFirstDefined(o['createdAt'], o['CreatedAt']) ?? ''),
    submittedAt: (pickFirstDefined(o['submittedAt'], o['SubmittedAt']) as string | null) ?? null,
    filePath: (pickFirstDefined(o['filePath'], o['FilePath']) as string | null) ?? null
  };
}

function normalizeBatchItemDto(raw: unknown): ClaimBatchItemDto {
  if (!raw || typeof raw !== 'object') {
    return { id: 0, claimId: 0, status: '', createdAt: '' };
  }
  const o = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  return {
    id: num(pickFirstDefined(o['id'], o['Id'])),
    claimId: num(pickFirstDefined(o['claimId'], o['ClaimId'])),
    status: String(pickFirstDefined(o['status'], o['Status']) ?? ''),
    errorMessage: (pickFirstDefined(o['errorMessage'], o['ErrorMessage']) as string | null) ?? null,
    createdAt: String(pickFirstDefined(o['createdAt'], o['CreatedAt']) ?? '')
  };
}

function normalizeBatchDetail(raw: unknown): ClaimBatchDetail {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      status: '',
      totalClaims: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: '',
      items: []
    };
  }
  const o = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  const itemsRaw = o['items'] ?? o['Items'];
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(normalizeBatchItemDto) : [];
  return {
    id: String(pickFirstDefined(o['id'], o['Id']) ?? ''),
    status: String(pickFirstDefined(o['status'], o['Status']) ?? ''),
    submitterReceiverId: (pickFirstDefined(o['submitterReceiverId'], o['SubmitterReceiverId']) as string | null) ?? null,
    connectionType: (pickFirstDefined(o['connectionType'], o['ConnectionType']) as string | null) ?? null,
    totalClaims: num(pickFirstDefined(o['totalClaims'], o['TotalClaims'])),
    successCount: num(pickFirstDefined(o['successCount'], o['SuccessCount'])),
    failureCount: num(pickFirstDefined(o['failureCount'], o['FailureCount'])),
    createdAt: String(pickFirstDefined(o['createdAt'], o['CreatedAt']) ?? ''),
    submittedAt: (pickFirstDefined(o['submittedAt'], o['SubmittedAt']) as string | null) ?? null,
    filePath: (pickFirstDefined(o['filePath'], o['FilePath']) as string | null) ?? null,
    items
  };
}

@Injectable({
  providedIn: 'root'
})
export class ClaimApiService {
  private baseUrl = `${environment.apiUrl}/api/claims`;

  constructor(private http: HttpClient) { }

  getClaims(
    page: number = 1, 
    pageSize: number = 25, 
    filters?: {
      status?: string;
      statusList?: string[]; // Excel-style multiple status values
      fromDate?: Date;
      toDate?: Date;
      searchText?: string;
      minClaimId?: number;
      maxClaimId?: number;
      minTotalCharge?: number;
      maxTotalCharge?: number;
      minTotalBalance?: number;
      maxTotalBalance?: number;
      patientId?: number; // Filter by patient (ClaPatFID)
      patAccountNo?: string; // Filter by patient account number (exact match; Account # column)
      additionalColumns?: string[]; // Additional columns from related tables
    }
  ): Observable<ClaimsApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());
    
    if (filters) {
      if (filters.status) {
        params = params.append('status', filters.status);
      }
      if (filters.statusList && filters.statusList.length > 0) {
        params = params.append('statusList', filters.statusList.join(','));
      }
      if (filters.fromDate) {
        params = params.append('fromDate', filters.fromDate.toISOString());
      }
      if (filters.toDate) {
        params = params.append('toDate', filters.toDate.toISOString());
      }
      if (filters.searchText) {
        params = params.append('searchText', filters.searchText);
      }
      if (filters.minClaimId !== undefined) {
        params = params.append('minClaimId', filters.minClaimId.toString());
      }
      if (filters.maxClaimId !== undefined) {
        params = params.append('maxClaimId', filters.maxClaimId.toString());
      }
      if (filters.minTotalCharge !== undefined) {
        params = params.append('minTotalCharge', filters.minTotalCharge.toString());
      }
      if (filters.maxTotalCharge !== undefined) {
        params = params.append('maxTotalCharge', filters.maxTotalCharge.toString());
      }
      if (filters.minTotalBalance !== undefined) {
        params = params.append('minTotalBalance', filters.minTotalBalance.toString());
      }
      if (filters.maxTotalBalance !== undefined) {
        params = params.append('maxTotalBalance', filters.maxTotalBalance.toString());
      }
      if (filters.patientId !== undefined && filters.patientId > 0) {
        params = params.append('patientId', filters.patientId.toString());
      }
      if (filters.patAccountNo != null && filters.patAccountNo.trim() !== '') {
        params = params.append('patAccountNo', filters.patAccountNo.trim());
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http
      .get<unknown>(this.baseUrl, { params })
      .pipe(map((body) => normalizeClaimsApiResponse(body)));
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }

  getClaimById(claId: number): Observable<Claim> {
    return this.http.get<Claim>(`${environment.apiUrl}/api/claims/${claId}`);
  }

  getUserKpis(trendDays: number = 30): Observable<UserKpiDashboard> {
    const params = new HttpParams().set('trendDays', trendDays.toString());
    return this.http.get<UserKpiDashboard>(`${this.baseUrl}/user-kpis`, { params });
  }

  scrubClaim(claimId: number): Observable<ScrubResult[]> {
    return this.http.post<ScrubResult[]>(`${this.baseUrl}/scrub`, { claimId });
  }

  /** Update claim. ClaStatus and ClaClassification from List Library. Physician FIDs map to Claim table. */
  updateClaim(claId: number, body: {
    claStatus?: string | null;
    claClassification?: string | null;
    claSubmissionMethod?: string | null;
    claBillTo?: number | null;
    primaryPayerId?: number | null;
    claRenderingPhyFID?: number | null;
    claFacilityPhyFID?: number | null;
    claInvoiceNumber?: string | null;
    claAdmittedDate?: string | null;
    claDischargedDate?: string | null;
    claDateLastSeen?: string | null;
    claBillDate?: string | null;
    claEDINotes?: string | null;
    claRemarks?: string | null;
    claRelatedTo?: number | null;
    claRelatedToState?: string | null;
    claLocked?: boolean;
    claDelayCode?: string | null;
    claMedicaidResubmissionCode?: string | null;
    claOriginalRefNo?: string | null;
    claPaperWorkTransmissionCode?: string | null;
    claPaperWorkControlNumber?: string | null;
    claPaperWorkInd?: string | null;
    /** Optional manual note for this edit. If empty, backend uses "Claim edited." */
    noteText?: string | null;
    /** Additional data (ClaAdditionalData XML) */
    additionalData?: import('./claim.models').ClaimAdditionalData;
  }): Observable<any> {
    const payload: any = {};
    if (body.claStatus !== undefined) payload.claStatus = body.claStatus;
    if (body.claClassification !== undefined) payload.claClassification = body.claClassification;
    if (body.claSubmissionMethod !== undefined) payload.claSubmissionMethod = body.claSubmissionMethod;
    if (body.claBillTo !== undefined) payload.claBillTo = body.claBillTo;
    if (body.primaryPayerId !== undefined) payload.primaryPayerId = body.primaryPayerId;
    if (body.claRenderingPhyFID !== undefined) payload.claRenderingPhyFID = body.claRenderingPhyFID;
    if (body.claFacilityPhyFID !== undefined) payload.claFacilityPhyFID = body.claFacilityPhyFID;
    if (body.claInvoiceNumber !== undefined) payload.claInvoiceNumber = body.claInvoiceNumber;
    if (body.claAdmittedDate !== undefined) payload.claAdmittedDate = body.claAdmittedDate ? new Date(body.claAdmittedDate).toISOString() : null;
    if (body.claDischargedDate !== undefined) payload.claDischargedDate = body.claDischargedDate ? new Date(body.claDischargedDate).toISOString() : null;
    if (body.claDateLastSeen !== undefined) payload.claDateLastSeen = body.claDateLastSeen ? new Date(body.claDateLastSeen).toISOString() : null;
    if (body.claBillDate !== undefined) payload.claBillDate = body.claBillDate ? new Date(body.claBillDate).toISOString() : null;
    if (body.claEDINotes !== undefined) payload.claEDINotes = body.claEDINotes;
    if (body.claRemarks !== undefined) payload.claRemarks = body.claRemarks;
    if (body.claRelatedTo !== undefined) payload.claRelatedTo = body.claRelatedTo;
    if (body.claRelatedToState !== undefined) payload.claRelatedToState = body.claRelatedToState;
    if (body.claLocked !== undefined) payload.claLocked = body.claLocked;
    if (body.claDelayCode !== undefined) payload.claDelayCode = body.claDelayCode;
    if (body.claMedicaidResubmissionCode !== undefined) payload.claMedicaidResubmissionCode = body.claMedicaidResubmissionCode;
    if (body.claOriginalRefNo !== undefined) payload.claOriginalRefNo = body.claOriginalRefNo;
    if (body.claPaperWorkTransmissionCode !== undefined) payload.claPaperWorkTransmissionCode = body.claPaperWorkTransmissionCode;
    if (body.claPaperWorkControlNumber !== undefined) payload.claPaperWorkControlNumber = body.claPaperWorkControlNumber;
    if (body.claPaperWorkInd !== undefined) payload.claPaperWorkInd = body.claPaperWorkInd;
    if (body.noteText !== undefined) payload.noteText = body.noteText;
    if (body.additionalData !== undefined) payload.additionalData = body.additionalData;
    return this.http.put<any>(`${environment.apiUrl}/api/claims/${claId}`, payload);
  }

  getSendableClaims(page: number = 1, pageSize: number = 100): Observable<ClaimsApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<unknown>(`${this.baseUrl}/sendable`, { params })
      .pipe(map((body) => normalizeClaimsApiResponse(body)));
  }

  getBatches(page: number = 1, pageSize: number = 50): Observable<{
    data: ClaimBatchListItem[];
    meta: PaginationMeta;
  }> {
    const params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<unknown>(`${this.baseUrl}/batches`, { params }).pipe(
      map((raw) => {
        const r = raw as Record<string, unknown>;
        const data = (r['data'] ?? r['Data'] ?? []) as unknown[];
        const metaRaw = r['meta'] ?? r['Meta'];
        const meta =
          normalizePaginationMeta(metaRaw) ?? ({ page: 1, pageSize, totalCount: 0 } as PaginationMeta);
        const rows = Array.isArray(data) ? data : [];
        return {
          data: rows.map((row) => normalizeBatchListItem(row)),
          meta
        };
      })
    );
  }

  getBatchById(batchId: string): Observable<ClaimBatchDetail> {
    return this.http.get<unknown>(`${this.baseUrl}/batches/${batchId}`).pipe(map((raw) => normalizeBatchDetail(raw)));
  }

  getBatchEdi(batchId: string): Observable<{ batchId: string; ediContent: string }> {
    return this.http.get<{ batchId: string; ediContent: string }>(`${this.baseUrl}/batches/${batchId}/edi`);
  }

  exportBatchZip(batchId: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/batches/${batchId}/export-zip`, null, { responseType: 'blob' });
  }

  sendBatch(body: {
    claimIds: number[];
    submitterReceiverId: string;
    connectionType: string;
    connectionLibraryId?: string;
    forceResubmit?: boolean;
  }): Observable<{
    success?: boolean;
    batchId: string;
    total?: number;
    successCount?: number;
    failureCount?: number;
    filePath?: string | null;
    submittedCount?: number;
    failedClaims?: Array<{ claimId: number; errorMessage: string }>;
    blockedClaims?: Array<{ claimId: number; reason: string }>;
  }> {
    console.log('[SendBatch][API] POST /api/claims/send-batch payload', {
      claimIds: body.claimIds,
      submitterReceiverId: body.submitterReceiverId,
      connectionType: body.connectionType
    });
    return this.http.post<{
      success?: boolean;
      batchId: string;
      total?: number;
      successCount?: number;
      failureCount?: number;
      filePath?: string | null;
      submittedCount?: number;
      failedClaims?: Array<{ claimId: number; errorMessage: string }>;
      blockedClaims?: Array<{ claimId: number; reason: string }>;
    }>(
      `${this.baseUrl}/send-batch`,
      body
    );
  }
}

export interface ScrubResult {
  ruleName: string;
  severity: string;
  message: string;
  affectedField: string;
}

