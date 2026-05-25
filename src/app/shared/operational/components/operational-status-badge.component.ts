import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
/** Status token for badge styling (claims + patients). */
export type OperationalClaimStatus =
  | 'draft'
  | 'submitted'
  | 'rts'
  | 'denied'
  | 'paid'
  | 'pending'
  | 'partial'
  | 'secondary'
  | 'closed'
  | 'unknown';

@Component({
  selector: 'app-operational-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="bb-status-badge op-badge" [ngClass]="cssClass">{{ label }}</span>`,
  styles: []
})
export class OperationalStatusBadgeComponent {
  @Input() claimStatus: OperationalClaimStatus | null = null;
  @Input() insuranceStatus: 'active' | 'inactive' | 'verify' | null = null;
  @Input() labelOverride: string | null = null;

  get label(): string {
    if (this.labelOverride) return this.labelOverride;
    if (this.insuranceStatus === 'active') return 'Active';
    if (this.insuranceStatus === 'inactive') return 'Inactive';
    if (this.insuranceStatus === 'verify') return 'Verify';
    if (!this.claimStatus || this.claimStatus === 'unknown') return '—';
    return this.claimStatus;
  }

  get cssClass(): string {
    if (this.insuranceStatus) {
      return `bb-status-badge--${this.insuranceStatus === 'verify' ? 'pending' : this.insuranceStatus} op-badge--${this.insuranceStatus === 'verify' ? 'pending' : this.insuranceStatus}`;
    }
    const cat = this.claimStatus ?? 'unknown';
    return `bb-status-badge--${cat} op-badge--${cat}`;
  }
}
