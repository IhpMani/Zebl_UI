import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FacilityService } from './facility.service';

export interface Hl7ImportResponse {
  success: boolean;
  fileName: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  errors?: number;
  /** First N per-message failure reasons from the API (when failedMessages > 0). */
  errorMessages?: string[];
}

export interface Hl7ReviewResponse {
  fileName: string;
  interfaceName: string;
  newPatientsCount: number;
  updatedPatientsCount: number;
  duplicatePatientsCount: number;
  newClaimsCount: number;
  totalAmount: number;
}

export interface Hl7ImportHistoryRow {
  importId: number;
  fileName: string;
  importDate: string;
  userName: string;
  computerName: string;
  newPatientsCount: number;
  updatedPatientsCount: number;
  newClaimsCount: number;
  duplicateClaimsCount: number;
  totalAmount: number;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class Hl7ImportService {
  private baseUrl = `${environment.apiUrl}/api/hl7`;

  constructor(
    private http: HttpClient,
    private facility: FacilityService
  ) {}

  reviewHl7File(file: File): Observable<Hl7ReviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Hl7ReviewResponse>(`${this.baseUrl}/review`, formData);
  }

  importHl7File(file: File): Observable<Hl7ImportResponse> {
    return defer(() => {
      const facilityId = this.facility.getFacilityIdStrict();
      return this.http
        .get<{ integrationId: number }>(`${environment.apiUrl}/api/integrations/by-facility`, {
          params: { facilityId: String(facilityId) }
        })
        .pipe(
          switchMap((r) => {
            const formData = new FormData();
            formData.append('file', file);
            return this.http.post<Hl7ImportResponse>(`${this.baseUrl}/import`, formData, {
              headers: {
                'X-Integration-Id': String(r.integrationId)
              }
            });
          })
        );
    });
  }

  getImportHistory(): Observable<Hl7ImportHistoryRow[]> {
    return this.http.get<Hl7ImportHistoryRow[]>(`${environment.apiUrl}/api/interface/history`);
  }
}
