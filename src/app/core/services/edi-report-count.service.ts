import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { EdiReportsApiService } from './edi-reports-api.service';

/** Provides the current EDI report count for the ribbon. Call refresh() when reports are loaded or fetched. */
@Injectable({ providedIn: 'root' })
export class EdiReportCountService {
  private readonly count$ = new BehaviorSubject<number>(0);

  constructor(private ediApi: EdiReportsApiService) {}

  getCount(): Observable<number> {
    return this.count$.asObservable();
  }

  get currentCount(): number {
    return this.count$.value;
  }

  /** Fetch count from API and update. Call on ribbon init. */
  refresh(): void {
    this.ediApi.getAll(false).subscribe({
      next: (list) => this.count$.next(Array.isArray(list) ? list.length : 0),
      error: () => this.count$.next(0)
    });
  }

  /** Set count directly (e.g. from EDI Reports page after load/fetch to avoid extra API call). */
  setCount(n: number): void {
    this.count$.next(n);
  }
}
