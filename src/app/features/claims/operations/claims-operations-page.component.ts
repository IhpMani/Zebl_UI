import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import {
  ClaimsOperationsMetrics,
  ClaimsOperationsQueryService,
  ClaimsQuickFilter
} from '../services/queries/claims-operations-query.service';
import { ClaimOperationsRowDto } from '../models/claim-operations-row.dto';

@Component({
  selector: 'app-claims-operations-page',
  templateUrl: './claims-operations-page.component.html',
  styleUrls: ['./claims-operations-page.component.css', '../workspace/claim-workspace.shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimsOperationsPageComponent implements OnInit, OnDestroy {
  readonly searchControl = new FormControl('', { nonNullable: true });
  rows: ClaimOperationsRowDto[] = [];
  metrics: ClaimsOperationsMetrics | null = null;
  loading = false;
  page = 1;
  pageSize = 50;
  totalCount = 0;
  quickFilter: ClaimsQuickFilter = 'all';
  highlightedIndex = 0;

  readonly filters: Array<{ id: ClaimsQuickFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'rts', label: 'RTS' },
    { id: 'denied', label: 'Denied' },
    { id: 'aging90', label: 'Aging 90+' },
    { id: 'openBalance', label: 'Open balance' },
    { id: 'noEra', label: 'No ERA' }
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly load$ = new Subject<void>();

  constructor(
    private readonly query: ClaimsOperationsQueryService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.query.getMetrics().pipe(takeUntil(this.destroy$)).subscribe((m) => {
      this.metrics = m;
      this.cdr.markForCheck();
    });

    this.load$.pipe(takeUntil(this.destroy$)).subscribe(() => this.fetch());

    this.searchControl.valueChanges
      .pipe(debounceTime(280), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.load$.next();
      });

    this.load$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(f: ClaimsQuickFilter): void {
    this.quickFilter = f;
    this.page = 1;
    this.load$.next();
  }

  openClaim(row: ClaimOperationsRowDto): void {
    void this.router.navigate(['/claims', row.claimId, 'workspace']);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.rows.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
    } else if (event.key === 'Enter' && this.rows[this.highlightedIndex]) {
      event.preventDefault();
      this.openClaim(this.rows[this.highlightedIndex]);
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.load$.next();
    }
  }

  nextPage(): void {
    if (this.page * this.pageSize < this.totalCount) {
      this.page++;
      this.load$.next();
    }
  }

  trackRow(_: number, r: ClaimOperationsRowDto): number {
    return r.claimId;
  }

  private fetch(): void {
    this.loading = true;
    this.query
      .search(this.page, this.pageSize, {
        searchText: this.searchControl.value,
        quickFilter: this.quickFilter
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.rows = res.rows;
          this.totalCount = res.totalCount;
          this.highlightedIndex = 0;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.rows = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }
}
