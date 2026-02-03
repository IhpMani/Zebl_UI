import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServicesApiResponse } from './service.models';

@Injectable({
  providedIn: 'root'
})
export class ServiceApiService {
  private baseUrl = '/api/services';

  constructor(private http: HttpClient) { }

  getServices(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      claimId?: number;
      searchText?: string;
      fromDate?: Date;
      toDate?: Date;
      minServiceId?: number;
      maxServiceId?: number;
      minCharges?: number;
      maxCharges?: number;
      additionalColumns?: string[];
    }
  ): Observable<ServicesApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
      if (filters.claimId !== undefined) {
        params = params.append('claimId', filters.claimId.toString());
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
      if (filters.minServiceId !== undefined) {
        params = params.append('minServiceId', filters.minServiceId.toString());
      }
      if (filters.maxServiceId !== undefined) {
        params = params.append('maxServiceId', filters.maxServiceId.toString());
      }
      if (filters.minCharges !== undefined) {
        params = params.append('minCharges', filters.minCharges.toString());
      }
      if (filters.maxCharges !== undefined) {
        params = params.append('maxCharges', filters.maxCharges.toString());
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<ServicesApiResponse>(this.baseUrl, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }

  getServicesByClaim(claId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/claims/${claId}`);
  }
}
