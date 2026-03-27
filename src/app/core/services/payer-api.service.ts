import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { PayersApiResponse, PayerDetailDto } from './payer.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PayerApiService {
  private baseUrl = `${environment.apiUrl}/api/payers`;
  private payersCache = new Map<string, Observable<PayersApiResponse>>();

  constructor(private http: HttpClient) { }

  getPayers(
    page: number = 1,
    pageSize: number = 100,
    filters?: { inactive?: boolean; classificationList?: string }
  ): Observable<PayersApiResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (filters?.inactive !== undefined) {
      params = params.set('inactive', filters.inactive.toString());
    }
    if (filters?.classificationList && filters.classificationList.trim()) {
      params = params.set('classificationList', filters.classificationList.trim());
    }
    const cacheKey = params.toString();
    const cached = this.payersCache.get(cacheKey);
    if (cached) return cached;
    const req$ = this.http.get<PayersApiResponse>(this.baseUrl, { params }).pipe(shareReplay(1));
    this.payersCache.set(cacheKey, req$);
    return req$;
  }

  getById(id: number): Observable<PayerDetailDto> {
    return this.http.get<PayerDetailDto>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<PayerDetailDto>): Observable<PayerDetailDto> {
    return this.http.post<PayerDetailDto>(this.baseUrl, body);
  }

  update(id: number, body: Partial<PayerDetailDto>): Observable<PayerDetailDto> {
    return this.http.put<PayerDetailDto>(`${this.baseUrl}/${id}`, { ...body, payID: id });
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }
}
