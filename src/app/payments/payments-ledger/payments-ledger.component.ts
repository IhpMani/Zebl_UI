import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimPaymentLedgerItem, PaginationMeta } from '../../core/services/payment.models';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';

type ApplyFilter = 'all' | 'applied' | 'unapplied';

interface TraceGroup {
  traceNumber: string;
  totalPaid: number;
  items: ClaimPaymentLedgerItem[];
}

@Component({
  selector: 'app-payments-ledger',
  templateUrl: './payments-ledger.component.html',
  styleUrls: ['./payments-ledger.component.css']
})
export class PaymentsLedgerComponent implements OnInit {
  loading = false;
  error: string | null = null;

  page = 1;
  pageSize = 50;
  meta: PaginationMeta | null = null;

  applyFilter: ApplyFilter = 'all';
  fromDate = '';
  toDate = '';
  payer = '';
  claimId = '';

  groups: TraceGroup[] = [];

  constructor(
    private readonly paymentApi: PaymentApiService,
    private readonly router: Router,
    private readonly workspace: WorkspaceService
  ) {}

  ngOnInit(): void {
    this.workspace.updateActiveTabTitle('Payments Ledger');
    this.load();
  }

  load(page: number = this.page): void {
    this.loading = true;
    this.error = null;
    this.page = page;

    const isApplied =
      this.applyFilter === 'applied' ? true : this.applyFilter === 'unapplied' ? false : null;

    this.paymentApi
      .getClaimPaymentLedger(this.page, this.pageSize, {
        isApplied,
        fromDateUtc: this.fromDate ? new Date(`${this.fromDate}T00:00:00.000Z`).toISOString() : undefined,
        toDateUtc: this.toDate ? new Date(`${this.toDate}T23:59:59.999Z`).toISOString() : undefined,
        payer: this.payer || undefined,
        claimExternalId: this.claimId || undefined
      })
      .subscribe({
        next: (response) => {
          const rows = response.data ?? [];
          this.groups = this.groupByTrace(rows);
          this.meta = response.meta;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load payment ledger.';
          this.groups = [];
          this.loading = false;
        }
      });
  }

  clearFilters(): void {
    this.applyFilter = 'all';
    this.fromDate = '';
    this.toDate = '';
    this.payer = '';
    this.claimId = '';
    this.load(1);
  }

  openClaim(item: ClaimPaymentLedgerItem): void {
    if (!item.claimId) {
      return;
    }
    this.router.navigate(['claims', item.claimId]);
  }

  statusOf(item: ClaimPaymentLedgerItem): string {
    if (item.claimId == null) return 'Orphan';
    if (item.isApplied) return 'Applied';
    return 'Unapplied';
  }

  getTotalPages(): number {
    if (!this.meta) return 0;
    return Math.max(1, Math.ceil(this.meta.totalCount / this.meta.pageSize));
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.load(1);
  }

  private groupByTrace(rows: ClaimPaymentLedgerItem[]): TraceGroup[] {
    const byTrace = new Map<string, TraceGroup>();
    for (const row of rows) {
      const key = row.traceNumber?.trim() || '(No Trace)';
      const existing = byTrace.get(key);
      if (existing) {
        existing.items.push(row);
        existing.totalPaid += row.paidAmount || 0;
      } else {
        byTrace.set(key, {
          traceNumber: key,
          totalPaid: row.paidAmount || 0,
          items: [row]
        });
      }
    }
    return Array.from(byTrace.values());
  }
}

