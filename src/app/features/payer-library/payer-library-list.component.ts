import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PayerApiService } from '../../core/services/payer-api.service';
import { PayerListItem } from '../../core/services/payer.models';

@Component({
  selector: 'app-payer-library-list',
  templateUrl: './payer-library-list.component.html',
  styleUrls: ['./payer-library-list.component.scss']
})
export class PayerLibraryListComponent implements OnInit, OnDestroy {
  payers: PayerListItem[] = [];
  selectedId: number | null = null;
  showInactive = false;
  loading = false;
  error: string | null = null;
  private routeSub?: Subscription;

  constructor(
    private payerApi: PayerApiService,
    public router: Router,
    public route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadPayers();

    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const childRoute = this.route.firstChild;
      if (childRoute) {
        const idParam = childRoute.snapshot.paramMap.get('id');
        if (idParam === 'new') this.selectedId = null;
        else if (idParam) this.selectedId = +idParam;
        else this.selectedId = null;
      } else {
        this.selectedId = null;
      }
    });

    const childRoute = this.route.firstChild;
    if (childRoute) {
      const idParam = childRoute.snapshot.paramMap.get('id');
      if (idParam === 'new') this.selectedId = null;
      else if (idParam) this.selectedId = +idParam;
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadPayers(): void {
    this.loading = true;
    this.error = null;
    this.payerApi.getPayers(1, 500, { inactive: this.showInactive }).subscribe({
      next: (res) => {
        this.payers = res.data || [];
        this.loading = false;
        // Only auto-select first payer when there is no child route (e.g. user opened /payer-library).
        // When child is 'new' (from ribbon) or an id, do not override.
        const hasChildRoute = !!this.route.firstChild;
        if (this.payers.length > 0 && this.selectedId == null && !hasChildRoute) {
          this.selectPayer(this.payers[0].payID);
        }
      },
      error: (err) => {
        const status = err?.status;
        if (status === 0) {
          this.error = 'Cannot reach the API. Start the Zebl API (e.g. on http://localhost:5226).';
        } else if (status === 504) {
          this.error = 'The API took too long to respond (gateway timeout). Ensure the Zebl API is running and try again, or use a smaller page size.';
        } else {
          this.error = err?.error?.message || err?.message || 'Failed to load payers';
        }
        this.loading = false;
      }
    });
  }

  onShowInactiveChange(): void {
    this.loadPayers();
  }

  selectPayer(id: number): void {
    this.selectedId = id;
    this.router.navigate([id], { relativeTo: this.route });
  }

  onAddNew(): void {
    this.selectedId = null;
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  isSelected(id: number): boolean {
    return this.selectedId === id;
  }

  get hasActiveChildRoute(): boolean {
    return !!this.route.firstChild;
  }

  displayName(p: PayerListItem): string {
    const name = p.payName?.trim() || '(No name)';
    return p.payInactive ? `${name} (Inactive)` : name;
  }
}
