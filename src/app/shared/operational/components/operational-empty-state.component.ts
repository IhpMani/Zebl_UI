import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-operational-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="op-empty">
      <p class="op-empty__title">{{ title }}</p>
      <p class="op-empty__hint" *ngIf="hint">{{ hint }}</p>
      <button *ngIf="actionLabel" type="button" class="bb-btn bb-btn--primary" (click)="action.emit()">
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [
    `
    .op-empty {
      padding: 20px 16px;
      text-align: center;
      font-size: 13px;
      color: var(--bb-muted, #64748b);
    }
    .op-empty__title { margin: 0 0 6px; font-weight: 600; color: var(--bb-text, #0f172a); }
    .op-empty__hint { margin: 0 0 12px; }
    `
  ]
})
export class OperationalEmptyStateComponent {
  @Input() title = 'No records';
  @Input() hint: string | null = null;
  @Input() actionLabel: string | null = null;
  @Output() action = new EventEmitter<void>();
}
