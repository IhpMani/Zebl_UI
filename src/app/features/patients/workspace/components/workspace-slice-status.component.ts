import { Component, Input } from '@angular/core';
import { SliceLoadState } from '../../models/workspace-load-state.model';

@Component({
  selector: 'app-workspace-slice-status',
  template: `
    <div *ngIf="slice?.status === 'loading'" class="bb-workspace-skeleton">{{ loadingLabel }}</div>
    <div *ngIf="slice?.status === 'error'" class="bb-workspace-error">{{ slice?.error }}</div>
  `,
  styles: [
    `
    .bb-workspace-skeleton { font-size: 13px; color: var(--bb-muted); padding: 8px 0; }
    .bb-workspace-error { font-size: 13px; color: var(--bb-danger); padding: 8px 0; }
    `
  ]
})
export class WorkspaceSliceStatusComponent {
  @Input() slice: SliceLoadState | null = null;
  @Input() loadingLabel = 'Loading…';
}
