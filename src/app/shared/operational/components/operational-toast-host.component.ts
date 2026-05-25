import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OperationalToastService } from '../services/operational-toast.service';

@Component({
  selector: 'app-operational-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="op-toast-host" *ngIf="toast.message$ | async as msg">
      <div class="op-toast" [class]="'op-toast--' + msg.tone" role="status">{{ msg.text }}</div>
    </div>
  `,
  styles: [
    `
    .op-toast-host {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 12000;
      pointer-events: none;
    }
    .op-toast {
      pointer-events: auto;
      min-width: 220px;
      max-width: 420px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      animation: op-toast-in 0.2s ease-out;
    }
    .op-toast--info { background: var(--bb-sidebar); color: var(--bb-text-inverse); }
    .op-toast--success { background: var(--bb-success); color: var(--bb-text-inverse); }
    .op-toast--warning { background: var(--bb-warning); color: #1c1917; }
    .op-toast--error { background: var(--bb-danger); color: var(--bb-text-inverse); }
    @keyframes op-toast-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    `
  ]
})
export class OperationalToastHostComponent {
  constructor(readonly toast: OperationalToastService) {}
}
