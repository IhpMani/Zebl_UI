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
  createdAt: string;
  batchFileName?: string | null;
  eligibilityStatus?: string | null;
  errorMessage?: string | null;
  raw271?: string | null;
  payerName?: string | null;
  planName?: string | null;
  planDetails?: string | null;
  eligibilityStartDate?: string | null;
  eligibilityEndDate?: string | null;
  benefits?: EligibilityBenefitDto[] | null;
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

export interface EligibilityBenefitDto {
  serviceType?: string | null;
  benefit?: string | null;
  amount?: string | null;
  description?: string | null;
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

  request(patientId: number): Observable<EligibilityRequestResultDto> {
    return this.http.post<EligibilityRequestResultDto>(`${this.baseUrl}/request`, {
      patientId
    });
  }

  getById(requestId: number, includeRaw271 = false): Observable<EligibilityStatusDto> {
    return this.http.get<EligibilityStatusDto>(`${this.baseUrl}/${requestId}?includeRaw271=${includeRaw271}`);
  }
}

