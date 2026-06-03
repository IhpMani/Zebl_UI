import { Injectable } from '@angular/core';
import { Observable, of, race, throwError, timer } from 'rxjs';
import { catchError, last, switchMap, takeUntil, takeWhile } from 'rxjs/operators';
import { EligibilityApiService, EligibilityStatusDto } from './eligibility-api.service';

export interface EligibilityPollingOptions {
  intervalMs: number;
  timeoutMs: number;
}

const TERMINAL_LIFECYCLE = new Set([
  'Completed',
  'Failed',
  'TimedOut',
  'DeadLettered'
]);

function isTerminal(status: EligibilityStatusDto): boolean {
  const lifecycle = status.lifecycleStatus ?? status.status;
  return TERMINAL_LIFECYCLE.has(lifecycle);
}

function isInFlight(status: EligibilityStatusDto): boolean {
  const lifecycle = status.lifecycleStatus ?? status.status;
  return !isTerminal(status) && lifecycle !== 'Pending';
}

@Injectable({ providedIn: 'root' })
export class EligibilityPollingService {
  constructor(private eligibilityApi: EligibilityApiService) {}

  /**
   * Polls until canonical lifecycle reaches a terminal state or timeout.
   * Timeout does not mean the inquiry failed on the server — callers should show "still processing".
   */
  pollUntilTerminal(
    requestId: number,
    options: EligibilityPollingOptions,
    cancel$: Observable<void>
  ): Observable<EligibilityStatusDto> {
    return this.pollWithUpdates(requestId, options, cancel$).pipe(last());
  }

  /**
   * Polls inquiry status on an interval and emits every update (for live modal UX).
   * Completes after the first terminal lifecycle status or errors on timeout.
   */
  pollWithUpdates(
    requestId: number,
    options: EligibilityPollingOptions,
    cancel$: Observable<void>
  ): Observable<EligibilityStatusDto> {
    const { intervalMs, timeoutMs } = options;

    const poll$ = timer(0, intervalMs).pipe(
      takeUntil(cancel$),
      switchMap(() => this.fetchStatus(requestId)),
      takeWhile(s => !isTerminal(s), true)
    );

    const timeout$ = timer(timeoutMs).pipe(
      takeUntil(cancel$),
      switchMap(() => throwError(() => new Error('ELIGIBILITY_POLL_TIMEOUT')))
    );

    return race(poll$, timeout$);
  }

  private fetchStatus(requestId: number): Observable<EligibilityStatusDto> {
    return this.eligibilityApi.getById(requestId).pipe(
      catchError(err =>
        of({
          id: requestId,
          patientId: 0,
          payerId: 0,
          subscriberId: '',
          controlNumber: '',
          status: 'Pending',
          lifecycleStatus: 'Queued',
          createdAt: new Date().toISOString(),
          errorMessage: err?.error?.message ?? err?.message ?? 'Eligibility polling failed'
        } as EligibilityStatusDto)
      )
    );
  }

  static isInFlight(status: EligibilityStatusDto | null | undefined): boolean {
    return !!status && isInFlight(status);
  }

  static isTerminal(status: EligibilityStatusDto | null | undefined): boolean {
    return !!status && isTerminal(status);
  }
}
