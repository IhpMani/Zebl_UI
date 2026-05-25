import { Component } from '@angular/core';
import { WorkspaceTabItem } from '../../shared/layout/workspace/workspace-tabs/workspace-tabs.component';

/**
 * Phase 1 layout scaffold only — no patient/claim API wiring.
 * Validates BroadBill workspace primitives before Phase 2+ rollout.
 */
@Component({
  selector: 'app-patient-workspace-preview',
  templateUrl: './patient-workspace-preview.component.html',
  styleUrls: ['./patient-workspace-preview.component.css']
})
export class PatientWorkspacePreviewComponent {
  readonly previewTabs: WorkspaceTabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'claims', label: 'Claims' },
    { id: 'payments', label: 'Payments' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'statements', label: 'Statements' },
    { id: 'era', label: 'ERA / EDI' },
    { id: 'documents', label: 'Documents' },
    { id: 'notes', label: 'Notes' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'audit', label: 'Audit Trail' }
  ];

  activeTabId = 'overview';

  onTabChange(tabId: string): void {
    this.activeTabId = tabId;
  }
}
