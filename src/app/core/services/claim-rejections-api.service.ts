import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ClaimRejectionDto {
  id: number;
  claimId: number;
  ediReportId: string;
  errorCode: string;
  description: string;
  segment: string;
  element: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClaimRejectionsApiService {
  private baseUrl = `${environment.apiUrl}/api/claims/rejections`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ClaimRejectionDto[]> {
    return this.http.get<ClaimRejectionDto[]>(this.baseUrl);
  }

  getById(id: number): Observable<ClaimRejectionDto> {
    return this.http.get<ClaimRejectionDto>(`${this.baseUrl}/${id}`);
  }

  resolve(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/resolve`, {});
  }
}

