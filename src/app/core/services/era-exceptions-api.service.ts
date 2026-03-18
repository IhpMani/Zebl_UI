import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EraExceptionDto {
  id: number;
  ediReportId: string;
  claimId?: number;
  serviceLineId?: number;
  exceptionType: string;
  message: string;
  eraClaimIdentifier: string;
  status: string;
  assignedUserId?: number;
  createdAt: string;
  resolvedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class EraExceptionsApiService {
  private baseUrl = `${environment.apiUrl}/api/era`;

  constructor(private http: HttpClient) {}

  getOpen(): Observable<EraExceptionDto[]> {
    return this.http.get<EraExceptionDto[]>(`${this.baseUrl}/exceptions`);
  }

  getById(id: number): Observable<EraExceptionDto> {
    return this.http.get<EraExceptionDto>(`${this.baseUrl}/exceptions/${id}`);
  }

  assign(id: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/exceptions/${id}/assign`, { userId });
  }

  resolve(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/exceptions/${id}/resolve`, {});
  }
}

