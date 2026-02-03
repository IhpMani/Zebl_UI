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
}

