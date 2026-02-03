import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PayersApiResponse } from './payer.models';

@Injectable({
  providedIn: 'root'
})
export class PayerApiService {
  private baseUrl = '/api/payers';

  constructor(private http: HttpClient) { }

  getPayers(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      searchText?: string;
      inactive?: boolean;
      fromDate?: Date;
      toDate?: Date;
      minPayerId?: number;
      maxPayerId?: number;
      additionalColumns?: string[];
    }
  ): Observable<PayersApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
      if (filters.searchText) {
        params = params.append('searchText', filters.searchText);
      }
      if (filters.inactive !== undefined) {
        params = params.append('inactive', filters.inactive.toString());
      }
      if (filters.fromDate) {
        params = params.append('fromDate', filters.fromDate.toISOString());
      }
      if (filters.toDate) {
        params = params.append('toDate', filters.toDate.toISOString());
      }
      if (filters.minPayerId !== undefined) {
        params = params.append('minPayerId', filters.minPayerId.toString());
      }
      if (filters.maxPayerId !== undefined) {
        params = params.append('maxPayerId', filters.maxPayerId.toString());
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<PayersApiResponse>(this.baseUrl, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }
}
