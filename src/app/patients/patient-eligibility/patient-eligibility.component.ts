import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EligibilityApiService, EligibilityRequestResultDto, EligibilityStatusDto } from '../../core/services/eligibility-api.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';

@Component({
  selector: 'app-patient-eligibility',
  templateUrl: './patient-eligibility.component.html',
  styleUrls: ['./patient-eligibility.component.scss']
})
export class PatientEligibilityComponent implements OnInit {
  patientId!: number;
  checking = false;
  error?: string;
  requestResult?: EligibilityRequestResultDto;
  currentStatus?: EligibilityStatusDto;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private eligibilityApi: EligibilityApiService,
    private workspace: WorkspaceService
  ) {}

  ngOnInit(): void {
    this.workspace.updateActiveTabTitle('Patient Eligibility');
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('patId');
      this.patientId = idParam ? Number(idParam) : 0;
      this.stopPolling();
    });
  }

  checkEligibility(): void {
    if (this.patientId <= 0 || this.checking) return;

    this.checking = true;
    this.error = undefined;
    this.currentStatus = undefined;
    this.eligibilityApi.preflight(this.patientId).subscribe({
      next: pf => {
        if (!pf.valid) {
          this.error = (pf.errors ?? []).join('\n') || 'Eligibility preflight failed.';
          this.checking = false;
          return;
        }
        this.eligibilityApi.request(this.patientId).subscribe({
          next: result => {
            this.requestResult = result;
            this.checking = false;
            this.fetchStatus();
            this.startPolling();
          },
          error: err => {
            this.error = err?.error?.error || err?.error?.message || 'Failed to request eligibility.';
            this.checking = false;
          }
        });
      },
      error: () => {
        this.error = 'Eligibility preflight could not be completed.';
        this.checking = false;
      }
    });
  }

  private fetchStatus(): void {
    if (!this.requestResult?.id) return;

    this.eligibilityApi.getById(this.requestResult.id, true).subscribe({
      next: status => {
        this.currentStatus = status;
        if (status.status === 'Completed' || status.status === 'Failed') {
          this.stopPolling();
        }
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to load eligibility status.';
      }
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.fetchStatus(), 5000);
  }

  private stopPolling(): void {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }
}

