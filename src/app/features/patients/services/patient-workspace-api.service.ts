import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PatientWorkspaceHeaderDto } from '../models/patient-workspace-header.dto';
import { PatientFinancialSummaryDto } from '../models/patient-financial-summary.dto';
import { PatientInsuranceSummaryDto } from '../models/patient-insurance-summary.dto';
import { PatientRecentClaimDto } from '../models/patient-recent-claim.dto';
import { PatientRecentPaymentDto } from '../models/patient-recent-payment.dto';

interface ClaimsPreviewResponse {
  items: PatientRecentClaimDto[];
}

interface PaymentsPreviewResponse {
  items: PatientRecentPaymentDto[];
}

interface LookupSearchResponse {
  items: PatientLookupApiRow[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** API shape for GET /api/patients/lookup */
export interface PatientLookupApiRow {
  patId: number;
  patientName: string;
  accountNo: string | null;
  mrn: string | null;
  dob: string | null;
  phone: string | null;
  primaryPayer: string | null;
  patientBalance: number | null;
  insuranceBalance: number | null;
  totalBalance: number | null;
  lastDos: string | null;
  openClaimCount: number;
  status: string;
}

/** Backend read-model projections for patient workspace (no full PatientDetail). */
@Injectable({ providedIn: 'root' })
export class PatientWorkspaceApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/patients`;

  constructor(private readonly http: HttpClient) {}

  getHeader(patId: number): Observable<PatientWorkspaceHeaderDto> {
    return this.http.get<PatientWorkspaceHeaderDto>(`${this.baseUrl}/${patId}/header`);
  }

  getFinancialSummary(patId: number): Observable<PatientFinancialSummaryDto> {
    return this.http.get<PatientFinancialSummaryDto>(`${this.baseUrl}/${patId}/financial-summary`);
  }

  getInsuranceSummary(patId: number): Observable<PatientInsuranceSummaryDto> {
    return this.http.get<PatientInsuranceSummaryDto>(`${this.baseUrl}/${patId}/insurance-summary`);
  }

  getClaimsPreview(patId: number, limit = 8): Observable<PatientRecentClaimDto[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http
      .get<ClaimsPreviewResponse>(`${this.baseUrl}/${patId}/claims-preview`, { params })
      .pipe(map((res) => res?.items ?? []));
  }

  getPaymentsPreview(patId: number, limit = 5): Observable<PatientRecentPaymentDto[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http
      .get<PaymentsPreviewResponse>(`${this.baseUrl}/${patId}/payments-preview`, { params })
      .pipe(map((res) => res?.items ?? []));
  }

  searchLookup(
    searchText: string,
    page = 1,
    pageSize = 25,
    active?: boolean
  ): Observable<LookupSearchResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    const q = searchText.trim();
    if (q) params = params.set('searchText', q);
    if (active !== undefined) params = params.set('active', String(active));
    return this.http.get<LookupSearchResponse>(`${this.baseUrl}/lookup`, { params });
  }
}
