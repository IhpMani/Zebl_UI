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
    pageSize: number = 100,
    filters?: { inactive?: boolean }
  ): Observable<PayersApiResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (filters?.inactive !== undefined) {
      params = params.set('inactive', filters.inactive.toString());
    }
    return this.http.get<PayersApiResponse>(this.baseUrl, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }
}
