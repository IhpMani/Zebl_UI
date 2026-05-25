import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PaymentApiService } from '../../../../core/services/payment-api.service';
import { PaymentListItem } from '../../../../core/services/payment.models';
import { PatientPaymentRowDto } from '../../models/patient-payment-row.dto';

export interface PatientPaymentsQueryResult {
  rows: PatientPaymentRowDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class PatientPaymentsQueryService {
  constructor(private readonly paymentApi: PaymentApiService) {}

  getPaymentRows(patId: number, page = 1, pageSize = 50): Observable<PatientPaymentsQueryResult> {
    return this.paymentApi.getPayments(page, pageSize, { patientId: patId }).pipe(
      map((res) => ({
        rows: (res.data ?? []).map((p) => this.toRow(p)),
        page: res.meta?.page ?? page,
        pageSize: res.meta?.pageSize ?? pageSize,
        totalCount: res.meta?.totalCount ?? 0
      })),
      catchError((err) => throwError(() => err))
    );
  }

  private toRow(p: PaymentListItem): PatientPaymentRowDto {
    return {
      paymentId: p.pmtID,
      paymentDate: p.pmtDate ?? null,
      paymentType: p.pmtMethod ?? null,
      payerName: p.pmtPayerName ?? null,
      amount: p.pmtAmount ?? null,
      unappliedAmount: p.pmtRemainingCC ?? null
    };
  }
}
