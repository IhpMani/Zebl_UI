import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { PatientWorkspaceApiService, PatientLookupApiRow } from '../patient-workspace-api.service';
import { PatientLookupFiltersDto, PatientLookupRowDto } from '../../models/patient-lookup-row.dto';

export interface PatientLookupQueryResult {
  rows: PatientLookupRowDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

const LOOKUP_DEBOUNCE_MS = 120;
const LOOKUP_MAX_PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class PatientLookupQueryService {
  constructor(private readonly workspaceApi: PatientWorkspaceApiService) {}

  /** Command-center overlay: requires search text or active-only filter. */
  search(filters: PatientLookupFiltersDto): Observable<PatientLookupQueryResult> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 25, LOOKUP_MAX_PAGE_SIZE);
    const searchText = (filters.searchText ?? '').trim();

    if (!searchText && filters.active !== true) {
      return of({ rows: [], page, pageSize, totalCount: 0 });
    }

    return this.fetchLookup(searchText, page, pageSize, filters.active).pipe(
      catchError(() => of({ rows: [], page, pageSize, totalCount: 0 }))
    );
  }

  /** Find Patients directory page — browse via GET /api/patients/lookup. */
  searchDirectory(filters: PatientLookupFiltersDto): Observable<PatientLookupQueryResult> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 25, LOOKUP_MAX_PAGE_SIZE);
    const searchText = (filters.searchText ?? '').trim();
    return this.fetchLookup(searchText, page, pageSize, filters.active);
  }

  errorMessage(err: unknown): string | null {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string } | null;
      return body?.message ?? err.message ?? `Request failed (${err.status})`;
    }
    if (err instanceof Error) return err.message;
    return 'An unexpected error occurred';
  }

  private fetchLookup(
    searchText: string,
    page: number,
    pageSize: number,
    active?: boolean
  ): Observable<PatientLookupQueryResult> {
    return this.workspaceApi.searchLookup(searchText, page, pageSize, active).pipe(
      map((res) => ({
        rows: (res.items ?? []).map((r) => this.toLookupRow(r)),
        page: res.page ?? page,
        pageSize: res.pageSize ?? pageSize,
        totalCount: res.totalCount ?? 0
      }))
    );
  }

  searchDebounced(
    searchText$: Observable<string>,
    filters: Omit<PatientLookupFiltersDto, 'searchText'> = {}
  ): Observable<PatientLookupQueryResult> {
    return searchText$.pipe(
      map((t) => (t ?? '').trim()),
      debounceTime(LOOKUP_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((searchText) => this.search({ ...filters, searchText, page: 1 }))
    );
  }

  private toLookupRow(r: PatientLookupApiRow): PatientLookupRowDto {
    const raw = r as PatientLookupApiRow & { PatId?: number };
    const patId = Number(raw.patId ?? raw.PatId);
    return {
      patId,
      patientName: r.patientName,
      accountNo: r.accountNo,
      mrn: r.mrn,
      dob: r.dob,
      phone: r.phone,
      primaryPayer: r.primaryPayer,
      patientBalance: r.patientBalance,
      insuranceBalance: r.insuranceBalance,
      totalBalance: r.totalBalance,
      lastDos: r.lastDos,
      openClaimCount: r.openClaimCount,
      status: r.status
    };
  }
}
