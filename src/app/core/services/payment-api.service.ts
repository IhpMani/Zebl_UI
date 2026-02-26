import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaymentEntryServiceLine, PaymentForEdit, PaymentsApiResponse } from './payment.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentApiService {
  private baseUrl = `${environment.apiUrl}/api/payments`;

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

  /** Create payment (POST /api/payments). Body: CreatePaymentCommand. */
  createPayment(command: any): Observable<{ data: number }> {
    return this.http.post<{ data: number }>(this.baseUrl, command);
  }

  /** Auto-apply remaining amount (POST /api/payments/{id}/auto-apply). */
  autoApply(paymentId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${paymentId}/auto-apply`, {});
  }

  /** Get a single payment by ID for edit form (GET /api/payments/:id). */
  getPaymentById(id: number): Observable<PaymentForEdit> {
    return this.http.get<{ data: PaymentForEdit }>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  /** Modify payment (PUT /api/payments/:id). Returns new payment ID. */
  modifyPayment(id: number, command: any): Observable<{ data: number }> {
    return this.http.put<{ data: number }>(`${this.baseUrl}/${id}`, command);
  }

  /** Get service lines for payment entry grid (GET /api/payments/entry/service-lines?patientId=&payerId=). */
  getServiceLinesForEntry(patientId: number, payerId?: number | null): Observable<PaymentEntryServiceLine[]> {
    let params = new HttpParams().set('patientId', patientId.toString());
    if (payerId != null && payerId > 0) {
      params = params.set('payerId', payerId.toString());
    }
    return this.http.get<{ data: PaymentEntryServiceLine[] }>(`${this.baseUrl}/entry/service-lines`, { params }).pipe(
      map(res => res.data ?? [])
    );
  }
}
