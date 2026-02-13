import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClaimNotesApiResponse } from './claim-note.models';

@Injectable({
  providedIn: 'root'
})
export class ClaimNoteApiService {
  private baseUrl = '/api/claims';

  constructor(private http: HttpClient) { }

  /** GET /api/claims/notes - Claim_Audit (one row per note) + all claim list columns */
  getClaimNotes(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      claimId?: number;
      searchText?: string;
      fromDate?: Date;
      toDate?: Date;
      additionalColumns?: string[];
    }
  ): Observable<ClaimNotesApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
      if (filters.claimId !== undefined) {
        params = params.append('minClaimId', filters.claimId.toString());
        params = params.append('maxClaimId', filters.claimId.toString());
      }
      if (filters.searchText) {
        params = params.append('searchText', filters.searchText);
      }
      if (filters.fromDate) {
        params = params.append('fromDate', filters.fromDate.toISOString());
      }
      if (filters.toDate) {
        params = params.append('toDate', filters.toDate.toISOString());
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<ClaimNotesApiResponse>(`${this.baseUrl}/notes`, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }
}
