import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdjustmentsApiResponse } from './adjustment.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdjustmentApiService {
  private baseUrl = `${environment.apiUrl}/api/adjustments`;

  constructor(private http: HttpClient) { }

  getAdjustments(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      serviceId?: number;
      searchText?: string;
      fromDate?: Date;
      toDate?: Date;
      minAdjustmentId?: number;
      maxAdjustmentId?: number;
      minAmount?: number;
      maxAmount?: number;
      groupCode?: string;
      additionalColumns?: string[];
    }
  ): Observable<AdjustmentsApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
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
      if (filters.minAdjustmentId !== undefined) {
        params = params.append('minAdjustmentId', filters.minAdjustmentId.toString());
      }
      if (filters.maxAdjustmentId !== undefined) {
        params = params.append('maxAdjustmentId', filters.maxAdjustmentId.toString());
      }
      if (filters.minAmount !== undefined) {
        params = params.append('minAmount', filters.minAmount.toString());
      }
      if (filters.maxAmount !== undefined) {
        params = params.append('maxAmount', filters.maxAmount.toString());
      }
      if (filters.groupCode) {
        params = params.append('groupCode', filters.groupCode);
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<AdjustmentsApiResponse>(`${this.baseUrl}/list`, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }

  getAdjustmentsByClaim(claId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/claims/${claId}`);
  }
}
