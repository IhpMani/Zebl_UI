import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DisbursementsApiResponse } from './disbursement.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DisbursementApiService {
  private baseUrl = `${environment.apiUrl}/api/disbursements`;

  constructor(private http: HttpClient) { }

  getDisbursements(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      paymentId?: number;
      serviceId?: number;
      searchText?: string;
      fromDate?: Date;
      toDate?: Date;
      minDisbursementId?: number;
      maxDisbursementId?: number;
      minAmount?: number;
      maxAmount?: number;
      additionalColumns?: string[];
    }
  ): Observable<DisbursementsApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
      if (filters.paymentId !== undefined) {
        params = params.append('paymentId', filters.paymentId.toString());
      }
      if (filters.serviceId !== undefined) {
        params = params.append('serviceId', filters.serviceId.toString());
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
      if (filters.minDisbursementId !== undefined) {
        params = params.append('minDisbursementId', filters.minDisbursementId.toString());
      }
      if (filters.maxDisbursementId !== undefined) {
        params = params.append('maxDisbursementId', filters.maxDisbursementId.toString());
      }
      if (filters.minAmount !== undefined) {
        params = params.append('minAmount', filters.minAmount.toString());
      }
      if (filters.maxAmount !== undefined) {
        params = params.append('maxAmount', filters.maxAmount.toString());
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<DisbursementsApiResponse>(this.baseUrl, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }

  getDisbursementsByClaim(claId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/claims/${claId}`);
  }
}
