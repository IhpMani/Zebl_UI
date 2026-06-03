import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Subject, throwError } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import {
  EligibilityApiService,
  EligibilityRequestResultDto,
  EligibilityStatusDto
} from '../../core/services/eligibility-api.service';
import { EligibilityPollingService } from '../../core/services/eligibility-polling.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';

@Component({
  selector: 'app-patient-eligibility',
  templateUrl: './patient-eligibility.component.html',
  styleUrls: ['./patient-eligibility.component.scss']
})
export class PatientEligibilityComponent implements OnInit, OnDestroy {
  patientId!: number;
  checking = false;
  polling = false;
  timedOut = false;
  error?: string;
  requestResult?: EligibilityRequestResultDto;
  currentStatus?: EligibilityStatusDto;
  private readonly destroy$ = new Subject<void>();
  private readonly pollTimeoutMs = 30 * 60 * 1000;

  constructor(
    private route: ActivatedRoute,
    private eligibilityApi: EligibilityApiService,
    private eligibilityPolling: EligibilityPollingService,
    private workspace: WorkspaceService
  ) {}

  ngOnInit(): void {
    this.workspace.updateActiveTabTitle('Patient Eligibility');
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const idParam = params.get('patId');
      this.patientId = idParam ? Number(idParam) : 0;
      this.resetState();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkEligibility(): void {
    if (this.patientId <= 0 || this.checking) return;

    this.resetState();
    this.checking = true;

    this.eligibilityApi
      .preflight(this.patientId)
      .pipe(
        switchMap(pf => {
          if (!pf.valid) {
            return throwError(() => new Error((pf.errors ?? []).join('\n') || 'Eligibility preflight failed.'));
          }
          return this.eligibilityApi.request(this.patientId, 'patient-eligibility');
        }),
        tap(result => {
          this.requestResult = result;
          this.polling = true;
        }),
        switchMap(result =>
          this.eligibilityPolling.pollUntilTerminal(
            result.id,
            { intervalMs: 5000, timeoutMs: this.pollTimeoutMs },
            this.destroy$
          )
        ),
        catchError(err => {
          if (err?.message === 'ELIGIBILITY_POLL_TIMEOUT') {
            this.timedOut = true;
            this.error =
              'No response in this session yet. The inquiry may still be processing — check again later.';
          } else {
            this.error = err?.error?.error || err?.message || 'Failed to request eligibility.';
          }
          return EMPTY;
        }),
        finalize(() => {
          this.checking = false;
          this.polling = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(status => {
        this.currentStatus = status;
      });
  }

  private resetState(): void {
    this.error = undefined;
    this.timedOut = false;
    this.requestResult = undefined;
    this.currentStatus = undefined;
    this.polling = false;
  }
}
