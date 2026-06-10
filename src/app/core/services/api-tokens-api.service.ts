import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiTokenListItemDto {
  id: string;
  name: string;
  facilityId: number;
  facilityName: string;
  tokenPreview: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  status: string;
  isActive: boolean;
}

export interface CreateApiTokenRequest {
  name: string;
  expiryDays: number;
  facilityId: number;
}

export interface CreateApiTokenResponse {
  id: string;
  name: string;
  token: string;
  tokenPreview: string;
  facilityId: number;
  expiresAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiTokensApiService {
  private readonly base = `${environment.apiUrl}/api/api-tokens`;

  constructor(private http: HttpClient) {}

  list(): Observable<ApiTokenListItemDto[]> {
    return this.http.get<ApiTokenListItemDto[]>(this.base);
  }

  create(req: CreateApiTokenRequest): Observable<CreateApiTokenResponse> {
    return this.http.post<CreateApiTokenResponse>(this.base, req);
  }

  revoke(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/revoke`, {});
  }
}
