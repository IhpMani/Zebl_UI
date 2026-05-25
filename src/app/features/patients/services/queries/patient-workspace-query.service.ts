import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';

import { catchError, map, shareReplay, tap } from 'rxjs/operators';

import { PatientWorkspaceApiService } from '../patient-workspace-api.service';

import { PatientWorkspaceHeaderDto } from '../../models/patient-workspace-header.dto';

import { PatientFinancialSummaryDto } from '../../models/patient-financial-summary.dto';

import { PatientRecentClaimDto } from '../../models/patient-recent-claim.dto';

import { PatientRecentPaymentDto } from '../../models/patient-recent-payment.dto';

import { PatientInsuranceSummaryDto } from '../../models/patient-insurance-summary.dto';

import { PatientAgingSummaryDto } from '../../models/patient-aging-summary.dto';

import { PatientBalanceSummaryDto } from '../../models/patient-balance-summary.dto';



interface SliceCacheEntry<T> {

  value$: Observable<T>;

  expiresAt: number;

}



/**

 * Workspace queries — each slice calls a focused backend projection endpoint.

 * Does not use GET /api/patients/{id} (legacy patient-details only).

 */

@Injectable({ providedIn: 'root' })

export class PatientWorkspaceQueryService {

  private readonly ttlMs = 30_000;

  private readonly headerCache = new Map<number, SliceCacheEntry<PatientWorkspaceHeaderDto>>();

  private readonly financialCache = new Map<number, SliceCacheEntry<PatientFinancialSummaryDto>>();

  private readonly insuranceCache = new Map<number, SliceCacheEntry<PatientInsuranceSummaryDto>>();



  constructor(private readonly workspaceApi: PatientWorkspaceApiService) {}



  getHeaderSummary(patId: number, force = false): Observable<PatientWorkspaceHeaderDto> {

    return this.cached(this.headerCache, patId, force, () =>

      this.workspaceApi.getHeader(patId).pipe(

        map((h) => this.normalizeHeader(h)),

        catchError((err) => {

          throw err;

        })

      )

    );

  }



  getBalanceSummary(patId: number, force = false): Observable<PatientBalanceSummaryDto> {

    return this.getFinancialSummary(patId, force).pipe(

      map((f) => ({

        patientBalance: f.patientBalance,

        insuranceBalance: f.insuranceBalance,

        totalBalance: f.totalBalance,

        inCollections: f.inCollections

      }))

    );

  }



  getFinancialSummary(patId: number, force = false): Observable<PatientFinancialSummaryDto> {

    return this.cached(this.financialCache, patId, force, () =>

      this.workspaceApi.getFinancialSummary(patId).pipe(

        map((f) => this.normalizeFinancial(f)),

        catchError((err) => {

          throw err;

        })

      )

    );

  }



  getInsuranceSummary(patId: number, force = false): Observable<PatientInsuranceSummaryDto> {

    return this.cached(this.insuranceCache, patId, force, () =>

      this.workspaceApi.getInsuranceSummary(patId).pipe(

        map((i) => this.normalizeInsurance(i)),

        catchError((err) => {

          throw err;

        })

      )

    );

  }



  /** Derived from financial-summary projection (single HTTP when loaded with financial). */

  getAgingSummary(patId: number, force = false): Observable<PatientAgingSummaryDto> {

    return this.getFinancialSummary(patId, force).pipe(

      map((f) => ({

        bucket0To30: f.aging0To30 ?? 0,

        bucket31To60: f.aging31To60 ?? 0,

        bucket61To90: f.aging61To90 ?? 0,

        bucket91To120: f.aging91To120 ?? 0,

        bucket120Plus: f.aging120Plus ?? 0

      }))

    );

  }



  getRecentClaims(patId: number, limit = 8): Observable<PatientRecentClaimDto[]> {

    return this.workspaceApi.getClaimsPreview(patId, limit).pipe(

      map((rows) => rows.map((r) => this.normalizeClaim(r))),

      catchError(() => of([]))

    );

  }



  getRecentPayments(patId: number, limit = 5): Observable<PatientRecentPaymentDto[]> {

    return this.workspaceApi.getPaymentsPreview(patId, limit).pipe(

      map((rows) => rows.map((r) => this.normalizePayment(r))),

      catchError(() => of([]))

    );

  }



  getOpenClaimsCount(patId: number): Observable<number> {

    return this.getHeaderSummary(patId).pipe(

      map((h) => h.openClaimsCount ?? 0),

      catchError(() => of(0))

    );

  }



  invalidatePatient(patId: number): void {

    this.headerCache.delete(patId);

    this.financialCache.delete(patId);

    this.insuranceCache.delete(patId);

  }



  private cached<T>(

    store: Map<number, SliceCacheEntry<T>>,

    patId: number,

    force: boolean,

    factory: () => Observable<T>

  ): Observable<T> {

    const now = Date.now();

    const hit = store.get(patId);

    if (!force && hit && hit.expiresAt > now) {

      return hit.value$;

    }



    const value$ = factory().pipe(

      shareReplay(1),

      tap({ error: () => store.delete(patId) })

    );

    store.set(patId, { value$, expiresAt: now + this.ttlMs });

    return value$;

  }



  private normalizeHeader(h: PatientWorkspaceHeaderDto): PatientWorkspaceHeaderDto {

    return {

      patId: h.patId,

      patientName: h.patientName,

      dob: h.dob ?? null,

      ageYears: h.ageYears ?? null,

      mrn: h.mrn ?? null,

      accountNo: h.accountNo ?? null,

      addressLine: h.addressLine ?? null,

      phone: h.phone ?? null,

      primaryPayer: h.primaryPayer ?? null,

      totalBalance: h.totalBalance ?? null,

      openClaimsCount: h.openClaimsCount ?? null,

      totalClaimsCount: h.totalClaimsCount ?? null,

      closedClaimsCount: h.closedClaimsCount ?? null,

      lastDos: h.lastDos ?? null,

      patActive: h.patActive ?? true,

      sex: h.sex ?? null,

      email: h.email ?? null

    };

  }



  private normalizeFinancial(f: PatientFinancialSummaryDto): PatientFinancialSummaryDto {

    return {

      patientBalance: Number(f.patientBalance ?? 0),

      insuranceBalance: Number(f.insuranceBalance ?? 0),

      totalBalance: Number(f.totalBalance ?? 0),

      unappliedPayments: Number(f.unappliedPayments ?? 0),

      inCollections: !!f.inCollections,

      aging0To30: f.aging0To30 ?? 0,

      aging31To60: f.aging31To60 ?? 0,

      aging61To90: f.aging61To90 ?? 0,

      aging91To120: f.aging91To120 ?? 0,

      aging120Plus: f.aging120Plus ?? 0

    };

  }



  private normalizeInsurance(i: PatientInsuranceSummaryDto): PatientInsuranceSummaryDto {

    return {

      primaryPayer: i.primaryPayer ?? null,

      secondaryPayer: i.secondaryPayer ?? null,

      subscriberName: i.subscriberName ?? null,

      groupNumber: i.groupNumber ?? null,

      planName: i.planName ?? null,

      effectiveDate: i.effectiveDate ?? null,

      eligibilityStatus: i.eligibilityStatus ?? null

    };

  }



  private normalizeClaim(r: PatientRecentClaimDto): PatientRecentClaimDto {

    return {

      claimId: r.claimId,

      dos: r.dos ?? null,

      status: r.status ?? null,

      charges: r.charges ?? null,

      insurancePaid: r.insurancePaid ?? null,

      patientPaid: r.patientPaid ?? null,

      balance: r.balance ?? null

    };

  }



  private normalizePayment(r: PatientRecentPaymentDto): PatientRecentPaymentDto {

    return {

      paymentId: r.paymentId,

      paymentDate: r.paymentDate ?? null,

      paymentType: r.paymentType ?? null,

      amount: r.amount ?? null

    };

  }

}

