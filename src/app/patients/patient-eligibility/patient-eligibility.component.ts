import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EligibilityApiService, EligibilityCheckResultDto, EligibilityHistoryItemDto } from '../../core/services/eligibility-api.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';

@Component({
  selector: 'app-patient-eligibility',
  templateUrl: './patient-eligibility.component.html',
  styleUrls: ['./patient-eligibility.component.scss']
})
export class PatientEligibilityComponent implements OnInit {
  patientId!: number;
  loading = false;
  checking = false;
  error?: string;
  lastResult?: EligibilityCheckResultDto;
  history: EligibilityHistoryItemDto[] = [];

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
      if (this.patientId > 0) {
        this.loadHistory();
      }
    });
  }

  loadHistory(): void {
    this.loading = true;
    this.error = undefined;
    this.eligibilityApi.getHistory(this.patientId).subscribe({
      next: items => {
        this.history = items;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to load eligibility history.';
        this.loading = false;
      }
    });
  }

  checkEligibility(): void {
    if (this.patientId <= 0 || this.checking) {
      return;
    }

    this.checking = true;
    this.error = undefined;
    this.eligibilityApi.check(this.patientId).subscribe({
      next: result => {
        this.lastResult = result;
        this.checking = false;
        this.loadHistory();
      },
      error: err => {
        this.error = err?.error?.message || err?.error?.error || 'Failed to run eligibility check.';
        this.checking = false;
      }
    });
  }
}

