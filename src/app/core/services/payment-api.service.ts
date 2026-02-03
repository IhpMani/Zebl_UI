import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentsApiResponse } from './payment.models';

@Injectable({
  providedIn: 'root'
})
export class PaymentApiService {
  private baseUrl = '/api/payments';

  constructor(private http: HttpClient) { }

  getPayments(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      patientId?: number;
      searchText?: string;
      fromDate?: Date;
      toDate?: Date;
      minPaymentId?: number;
      maxPaymentId?: number;
      minAmount?: number;
      maxAmount?: number;
      additionalColumns?: string[];
    }
  ): Observable<PaymentsApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
      if (filters.patientId !== undefined) {
        params = params.append('patientId', filters.patientId.toString());
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
      if (filters.minPaymentId !== undefined) {
        params = params.append('minPaymentId', filters.minPaymentId.toString());
      }
      if (filters.maxPaymentId !== undefined) {
        params = params.append('maxPaymentId', filters.maxPaymentId.toString());
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

    return this.http.get<PaymentsApiResponse>(`${this.baseUrl}/list`, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }

  getPaymentsByClaim(claId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/claims/${claId}`);
  }
}
