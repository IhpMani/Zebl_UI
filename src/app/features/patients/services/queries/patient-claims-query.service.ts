import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ClaimApiService } from '../../../../core/services/claim-api.service';
import { ClaimListItem } from '../../../../core/services/claim.models';
import { PatientClaimRowDto } from '../../models/patient-claim-row.dto';
import { balanceTone, deriveClaimStatusCategory } from '../../utils/claim-status.util';

export interface PatientClaimsQueryResult {
  rows: PatientClaimRowDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class PatientClaimsQueryService {
  constructor(private readonly claimApi: ClaimApiService) {}

  getClaimRows(patId: number, page = 1, pageSize = 50): Observable<PatientClaimsQueryResult> {
    return this.claimApi.getClaims(page, pageSize, { patientId: patId }).pipe(
      map((res) => ({
        rows: (res.data ?? []).map((c) => this.toRow(c)),
        page: res.meta?.page ?? page,
        pageSize: res.meta?.pageSize ?? pageSize,
        totalCount: res.meta?.totalCount ?? 0
      })),
      catchError((err) => throwError(() => err))
    );
  }

  private toRow(c: ClaimListItem): PatientClaimRowDto {
    const balance = c.claTotalBalanceCC ?? null;
    const cat = deriveClaimStatusCategory(c.claStatus);
    return {
      claimId: c.claID,
      dos: c.claFirstDateTRIG ?? null,
      payerName: c.primaryPayerName ?? null,
      status: c.claStatus ?? null,
      statusCategory: cat,
      charges: c.claTotalChargeTRIG ?? null,
      insurancePaid: c.claTotalAmtPaidCC ?? null,
      patientPaid: null,
      balance,
      balanceOverdue: balanceTone(balance) === 'overdue'
    };
  }
}
