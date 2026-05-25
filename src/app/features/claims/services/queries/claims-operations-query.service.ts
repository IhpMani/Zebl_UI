import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ClaimApiService } from '../../../../core/services/claim-api.service';
import { ClaimListItem, UserKpiDashboard } from '../../../../core/services/claim.models';
import { ClaimOperationsRowDto } from '../../models/claim-operations-row.dto';
import {
  deriveClaimStatusCategory,
  deriveEdiStatus,
  isRtsStatus
} from '../../utils/claim-status.util';

export interface ClaimsOperationsQueryResult {
  rows: ClaimOperationsRowDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ClaimsOperationsMetrics {
  submittedToday: number;
  rtsCount: number;
  denials: number;
  unpaidClaims: number;
  eraPending: number;
  highBalanceCount: number;
}

export type ClaimsQuickFilter =
  | 'all'
  | 'rts'
  | 'denied'
  | 'aging90'
  | 'openBalance'
  | 'noEra';

@Injectable({ providedIn: 'root' })
export class ClaimsOperationsQueryService {
  constructor(private readonly claimApi: ClaimApiService) {}

  search(
    page: number,
    pageSize: number,
    opts: { searchText?: string; quickFilter?: ClaimsQuickFilter; statusList?: string[] }
  ): Observable<ClaimsOperationsQueryResult> {
    const filters: Parameters<ClaimApiService['getClaims']>[2] = {
      searchText: opts.searchText?.trim() || undefined
    };
    if (opts.quickFilter === 'rts') {
      filters.statusList = ['RTS', 'Return to Sender'];
    } else if (opts.quickFilter === 'denied') {
      filters.statusList = ['Denied', 'Rejected'];
    } else if (opts.statusList?.length) {
      filters.statusList = opts.statusList;
    }

    return this.claimApi.getClaims(page, pageSize, filters).pipe(
      map((res) => {
        let rows = (res.data ?? []).map((c) => this.toRow(c));
        if (opts.quickFilter === 'aging90') {
          rows = rows.filter((r) => (r.agingDays ?? 0) >= 90);
        }
        if (opts.quickFilter === 'openBalance') {
          rows = rows.filter((r) => Number(r.totalBalance ?? 0) > 0);
        }
        if (opts.quickFilter === 'noEra') {
          rows = rows.filter((r) => r.ediStatus === '—');
        }
        return {
          rows,
          page: res.meta?.page ?? page,
          pageSize: res.meta?.pageSize ?? pageSize,
          totalCount: res.meta?.totalCount ?? 0
        };
      }),
      catchError(() => of({ rows: [], page, pageSize, totalCount: 0 }))
    );
  }

  getMetrics(): Observable<ClaimsOperationsMetrics> {
    return this.claimApi.getUserKpis(7).pipe(
      map((k) => this.kpisToMetrics(k)),
      catchError(() =>
        of({
          submittedToday: 0,
          rtsCount: 0,
          denials: 0,
          unpaidClaims: 0,
          eraPending: 0,
          highBalanceCount: 0
        })
      )
    );
  }

  private toRow(c: ClaimListItem): ClaimOperationsRowDto {
    const dos = c.claFirstDateTRIG ?? c.claDateTotalFrom ?? null;
    return {
      claimId: c.claID,
      patientName: c.patFullNameCC ?? null,
      dos,
      payer: c.primaryPayerName ?? null,
      status: c.claStatus,
      statusCategory: deriveClaimStatusCategory(c.claStatus),
      charges: c.claTotalChargeTRIG,
      insuranceBalance: c.claTotalInsBalanceTRIG ?? null,
      patientBalance: c.claTotalPatBalanceTRIG ?? null,
      totalBalance: c.claTotalBalanceCC,
      lastActivity: c.modifiedDate ?? c.claDateTimeModified ?? null,
      agingDays: this.calcAging(dos),
      isRts: isRtsStatus(c.claStatus),
      ediStatus: c.claSubmissionMethod?.toLowerCase().includes('edi') ? 'EDI' : '—'
    };
  }

  private kpisToMetrics(k: UserKpiDashboard): ClaimsOperationsMetrics {
    const byStatus = k.claimsByStatus ?? [];
    const rts = byStatus.find((p) => p.label.toLowerCase().includes('rts'))?.value ?? 0;
    const denied = byStatus.find((p) => p.label.toLowerCase().includes('denied'))?.value ?? 0;
    const highBalance = (k.agingBuckets ?? []).filter((b) => b.label.includes('90')).reduce((s, b) => s + b.value, 0);
    return {
      submittedToday: Math.round((k.claimsTrend?.at(-1)?.value ?? 0)),
      rtsCount: rts,
      denials: denied,
      unpaidClaims: k.totalBalance > 0 ? Math.round(k.totalClaims * 0.4) : 0,
      eraPending: 0,
      highBalanceCount: highBalance
    };
  }

  private calcAging(dos: string | null): number | null {
    if (!dos) return null;
    const d = new Date(dos);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
}
