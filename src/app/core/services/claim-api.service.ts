import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClaimsApiResponse, Claim } from './claim.models';

@Injectable({
  providedIn: 'root'
})
export class ClaimApiService {
  private baseUrl = '/api/claims';

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
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<ClaimsApiResponse>(this.baseUrl, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }

  getClaimById(claId: number): Observable<Claim> {
    return this.http.get<Claim>(`/api/claims/${claId}`);
  }

  /** Update claim. ClaStatus and ClaClassification from List Library. Physician FIDs map to Claim table. */
  updateClaim(claId: number, body: {
    claStatus?: string | null;
    claClassification?: string | null;
    claSubmissionMethod?: string | null;
    claRenderingPhyFID?: number | null;
    claFacilityPhyFID?: number | null;
    claInvoiceNumber?: string | null;
    claAdmittedDate?: string | null;
    claDischargedDate?: string | null;
    claDateLastSeen?: string | null;
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
  }): Observable<void> {
    const payload: any = {};
    if (body.claStatus !== undefined) payload.claStatus = body.claStatus;
    if (body.claClassification !== undefined) payload.claClassification = body.claClassification;
    if (body.claSubmissionMethod !== undefined) payload.claSubmissionMethod = body.claSubmissionMethod;
    if (body.claRenderingPhyFID !== undefined) payload.claRenderingPhyFID = body.claRenderingPhyFID;
    if (body.claFacilityPhyFID !== undefined) payload.claFacilityPhyFID = body.claFacilityPhyFID;
    if (body.claInvoiceNumber !== undefined) payload.claInvoiceNumber = body.claInvoiceNumber;
    if (body.claAdmittedDate !== undefined) payload.claAdmittedDate = body.claAdmittedDate ? new Date(body.claAdmittedDate).toISOString() : null;
    if (body.claDischargedDate !== undefined) payload.claDischargedDate = body.claDischargedDate ? new Date(body.claDischargedDate).toISOString() : null;
    if (body.claDateLastSeen !== undefined) payload.claDateLastSeen = body.claDateLastSeen ? new Date(body.claDateLastSeen).toISOString() : null;
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
    return this.http.put<void>(`/api/claims/${claId}`, payload);
  }
}

