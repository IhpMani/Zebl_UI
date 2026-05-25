import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-widget-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bb-skel" [class.bb-skel--card]="variant === 'card'" [class.bb-skel--table]="variant === 'table'">
      <div class="bb-skel__bar bb-skeleton" *ngFor="let _ of bars"></div>
    </div>
  `,
  styles: [
    `
    .bb-skel {
      display: flex;
      flex-direction: column;
      gap: var(--bb-space-sm);
      padding: var(--bb-space-xs) 0;
    }
    .bb-skel--card .bb-skel__bar:nth-child(1) {
      width: 40%;
      height: 14px;
    }
    .bb-skel--card .bb-skel__bar:nth-child(2) {
      width: 70%;
      height: 22px;
    }
    .bb-skel--card .bb-skel__bar:nth-child(3) {
      width: 55%;
      height: 14px;
    }
    .bb-skel--table .bb-skel__bar {
      height: 12px;
    }
    .bb-skel--table .bb-skel__bar:nth-child(odd) {
      width: 100%;
    }
    .bb-skel--table .bb-skel__bar:nth-child(even) {
      width: 92%;
    }
    `
  ]
})
export class WorkspaceWidgetSkeletonComponent {
  @Input() variant: 'card' | 'table' = 'card';
  @Input() rows = 3;

  get bars(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
