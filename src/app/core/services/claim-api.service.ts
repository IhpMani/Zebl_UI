import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Claim } from './claim.models';

@Injectable({
  providedIn: 'root'
})
export class ClaimApiService {
  private baseUrl = '/api/claims';

  constructor(private http: HttpClient) { }

  getClaims(page: number = 1, pageSize: number = 25): Observable<ApiResponse<Claim>> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<Claim>>(this.baseUrl, { params });
  }

  getClaimById(claId: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.baseUrl}/${claId}`);
  }

  getClaimPayments(claId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${claId}/payments`);
  }

  getClaimAdjustments(claId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${claId}/adjustments`);
  }
}

