import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PatientWorkspaceStateService } from '../../services/patient-workspace-state.service';
import { PatientContextualActionsService } from '../../services/patient-contextual-actions.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-contextual-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ctx-actions" *ngIf="actions$ | async as actions">
      <button
        *ngFor="let a of actions"
        type="button"
        class="ctx-actions__btn"
        [class.ctx-actions__btn--warning]="a.tone === 'warning'"
        [class.ctx-actions__btn--danger]="a.tone === 'danger'"
        [class.ctx-actions__btn--primary]="a.tone === 'primary'"
        [disabled]="a.disabled"
        (click)="run(a)"
      >
        {{ a.label }}
      </button>
    </div>
  `,
  styles: [
    `
    .ctx-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 0 8px;
    }
    .ctx-actions__btn {
      height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid var(--bb-border, #e2e8f0);
      background: #f8fafc;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .ctx-actions__btn--primary {
      background: var(--bb-primary, #2563eb);
      border-color: var(--bb-primary, #2563eb);
      color: #fff;
    }
    .ctx-actions__btn--warning { border-color: #fdba74; background: #fff7ed; color: #c2410c; }
    .ctx-actions__btn--danger { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }
    `
  ]
})
export class PatientContextualActionsComponent {
  actions$ = combineLatest([
    this.state.header$,
    this.state.financial$,
    this.state.claimsPreview$
  ]).pipe(
    map(([header, financial, claims]) => this.actions.buildActions(header, financial, claims))
  );

  constructor(
    private readonly state: PatientWorkspaceStateService,
    private readonly actions: PatientContextualActionsService,
    private readonly router: Router
  ) {}

  run(action: { route?: string | null; queryParams?: Record<string, string | number> }): void {
    if (!action.route) return;
    const segments = action.route.replace(/^\//, '').split('/').filter(Boolean);
    void this.router.navigate(segments, { queryParams: action.queryParams });
  }
}
