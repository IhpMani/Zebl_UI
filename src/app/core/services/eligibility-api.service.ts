import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EligibilityCheckResultDto {
  success: boolean;
  raw271?: string | null;
  message?: string | null;
  payerName?: string | null;
  status?: string | null;
  planName?: string | null;
  deductibleAmount?: number | null;
  copayAmount?: number | null;
  coinsurancePercent?: number | null;
  coverageStartDate?: string | null;
  coverageEndDate?: string | null;

  // Insured/Patient fields shown in Eligibility popup.
  patientName?: string | null;
  patientAddress?: string | null;
  identification?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  eligibilityDate?: string | null;
  inquiryDate?: string | null;
}

export interface EligibilityHistoryItemDto {
  requestId: number;
  checkDate: string;
  status: string;
  coverageStatus?: string | null;
  planName?: string | null;
  deductibleAmount?: number | null;
  copayAmount?: number | null;
  coinsurancePercent?: number | null;
  coverageStartDate?: string | null;
  coverageEndDate?: string | null;
}

export interface EligibilityRawResponseDto {
  requestId: number;
  raw271: string;
}

@Injectable({ providedIn: 'root' })
export class EligibilityApiService {
  private baseUrl = `${environment.apiUrl}/api/eligibility`;

  constructor(private http: HttpClient) {}

  check(patientId: number): Observable<EligibilityCheckResultDto> {
    return this.http.post<EligibilityCheckResultDto>(`${this.baseUrl}/check`, {
      patientId
    });
  }

  getHistory(patientId: number): Observable<EligibilityHistoryItemDto[]> {
    return this.http.get<EligibilityHistoryItemDto[]>(`${this.baseUrl}/history/${patientId}`);
  }

  getRaw(requestId: number): Observable<EligibilityRawResponseDto> {
    return this.http.get<EligibilityRawResponseDto>(`${this.baseUrl}/${requestId}/raw`);
  }
}

