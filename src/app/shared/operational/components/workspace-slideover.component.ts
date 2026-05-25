import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspaceSlideoverService } from '../services/workspace-slideover.service';

@Component({
  selector: 'app-workspace-slideover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="op-slideover-backdrop" *ngIf="slideover.config$ | async as cfg" (click)="slideover.close()">
      <aside
        class="op-slideover"
        [class.op-slideover--sm]="cfg.width === 'sm'"
        [class.op-slideover--lg]="cfg.width === 'lg'"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
      >
        <header class="op-slideover__head">
          <div>
            <h2 class="op-slideover__title">{{ cfg.title }}</h2>
            <p class="op-slideover__sub" *ngIf="cfg.subtitle">{{ cfg.subtitle }}</p>
          </div>
          <button type="button" class="op-slideover__close" (click)="slideover.close()" aria-label="Close">×</button>
        </header>
        <div class="op-slideover__body">
          <ng-container *ngIf="cfg.context as ctx">
            <dl class="op-slideover-kv" *ngIf="ctx['claimId']">
              <dt>Claim #</dt><dd>{{ ctx['claimId'] }}</dd>
              <dt>Status</dt><dd>{{ ctx['status'] || '-' }}</dd>
              <dt>DOS</dt><dd>{{ ctx['dos'] || '-' }}</dd>
              <dt>Charges</dt><dd>{{ money(ctx['charges']) }}</dd>
              <dt>Balance</dt><dd>{{ money(ctx['balance']) }}</dd>
            </dl>
            <dl class="op-slideover-kv" *ngIf="ctx['paymentId'] && !ctx['claimId']">
              <dt>Payment #</dt><dd>{{ ctx['paymentId'] }}</dd>
              <dt>Date</dt><dd>{{ ctx['paymentDate'] || '-' }}</dd>
              <dt>Amount</dt><dd>{{ money(ctx['amount']) }}</dd>
              <dt>Unapplied</dt><dd>{{ money(ctx['unappliedAmount']) }}</dd>
            </dl>
            <div class="op-slideover-actions" *ngIf="ctx['claimId']">
              <a class="bb-btn bb-btn--primary" [routerLink]="['/claims', ctx['claimId']]">Open full claim</a>
            </div>
            <div class="op-slideover-actions" *ngIf="ctx['paymentId'] && !ctx['claimId']">
              <a class="bb-btn" [routerLink]="['/payments/entry', ctx['paymentId']]">Open payment</a>
            </div>
          </ng-container>
        </div>
      </aside>
    </div>
  `,
  styles: [
    `
    .op-slideover-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      z-index: 11000;
      animation: op-fade-in 0.15s ease-out;
    }
    .op-slideover {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: min(480px, 92vw);
      background: var(--bb-surface, #fff);
      border-left: 1px solid var(--bb-border, #e2e8f0);
      display: flex;
      flex-direction: column;
      animation: op-slide-in 0.2s ease-out;
      box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
    }
    .op-slideover--sm { width: min(360px, 88vw); }
    .op-slideover--lg { width: min(640px, 94vw); }
    .op-slideover__head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--bb-border, #e2e8f0);
    }
    .op-slideover__title { margin: 0; font-size: 16px; font-weight: 700; }
    .op-slideover__sub { margin: 4px 0 0; font-size: 12px; color: var(--bb-muted, #64748b); }
    .op-slideover__close {
      border: none;
      background: transparent;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      color: var(--bb-muted, #64748b);
    }
    .op-slideover__body { flex: 1; overflow: auto; padding: 14px 16px; }
    .op-slideover-kv {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 8px 12px;
      font-size: 13px;
      margin: 0 0 16px;
    }
    .op-slideover-kv dt { color: var(--bb-muted, #64748b); margin: 0; }
    .op-slideover-kv dd { margin: 0; font-weight: 600; }
    .op-slideover-actions { display: flex; gap: 8px; }
    @keyframes op-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes op-slide-in { from { transform: translateX(12px); opacity: 0.9; } to { transform: translateX(0); opacity: 1; } }
    `
  ]
})
export class WorkspaceSlideoverComponent {
  constructor(readonly slideover: WorkspaceSlideoverService) {}

  money(value: unknown): string {
    const n = Number(value);
    if (value == null || Number.isNaN(n)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }
}
