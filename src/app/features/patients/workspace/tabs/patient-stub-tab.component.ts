import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { PatientWorkspaceStateService } from '../../services/patient-workspace-state.service';
import { PatientWorkspaceTabId, isPatientWorkspaceTabId } from '../../models/patient-workspace-tab-id';
import { SliceLoadState, WorkspaceSliceKey } from '../../models/workspace-load-state.model';

@Component({
  selector: 'app-patient-stub-tab',
  template: `
    <app-workspace-slice-status [slice]="slice$ | async"></app-workspace-slice-status>
    <app-workspace-panel *ngIf="(slice$ | async)?.status === 'loaded'" [title]="title">
      <p class="bb-muted">Tab module ready — Phase 3+ will bind operational data.</p>
    </app-workspace-panel>
  `,
  styleUrls: ['./patient-tab.shared.css']
})
export class PatientStubTabComponent implements OnInit {
  @Input() tabId?: PatientWorkspaceTabId;
  @Input() title = 'Tab';

  slice$!: Observable<SliceLoadState>;

  constructor(
    private readonly state: PatientWorkspaceStateService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const fromRoute = this.route.snapshot.data['tabId'] as string;
    if (!this.tabId && isPatientWorkspaceTabId(fromRoute)) {
      this.tabId = fromRoute;
    }
    if (!this.tabId) return;
    this.title = this.route.snapshot.data['title'] ?? this.title;
    this.slice$ = this.state.slice$(this.tabId as WorkspaceSliceKey);
    this.state.setActiveTab(this.tabId);
  }
}
