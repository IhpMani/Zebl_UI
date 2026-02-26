import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ReceiverLibraryService } from './receiver-library.service';
import { ReceiverLibraryDto } from '../../core/services/receiver-library-api.service';

@Component({
  selector: 'app-receiver-library-list',
  templateUrl: './receiver-library-list.component.html',
  styleUrls: ['./receiver-library-list.component.scss']
})
export class ReceiverLibraryListComponent implements OnInit, OnDestroy {
  libraries: ReceiverLibraryDto[] = [];
  selectedId: string | null = null;
  loading = false;
  error: string | null = null;
  private routeSub?: Subscription;
  private refreshSub?: Subscription;

  constructor(
    private service: ReceiverLibraryService,
    public router: Router,
    public route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadLibraries();

    // Refresh list when detail triggers it (e.g. Save and New)
    this.refreshSub = this.service.onListRefresh.subscribe(() => this.loadLibraries());

    // Track route changes to update selected ID and refresh list when returning to it
    this.routeSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = (event.urlAfterRedirects || event.url || this.router.url || '').replace(/\/$/, '');
      const isListView = url === '/receiver-library' || url.endsWith('/receiver-library');

      const childRoute = this.route.firstChild;
      if (childRoute) {
        const idParam = childRoute.snapshot.paramMap.get('id');
        this.selectedId = idParam === 'new' ? null : idParam;
      } else {
        this.selectedId = null;
      }
      // When we're on the list view (no child segment), refresh so new/updated entries appear
      if (isListView) {
        this.loadLibraries();
      }
    });
    
    // Check initial route
    const childRoute = this.route.firstChild;
    if (childRoute) {
      const idParam = childRoute.snapshot.paramMap.get('id');
      this.selectedId = idParam === 'new' ? null : idParam;
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
  }

  loadLibraries(): void {
    this.loading = true;
    this.error = null;
    this.service.getAll().subscribe({
      next: (data) => {
        this.libraries = data;
        this.loading = false;
        // Only auto-select first when we have a child route (not on list-only view), so after Save & Close the new entry stays visible
        const child = this.route.firstChild;
        const childId = child?.snapshot?.paramMap?.get('id');
        if (child && this.libraries.length > 0 && !this.selectedId && childId && childId !== 'new') {
          this.selectLibrary(this.libraries[0].id);
        }
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load receiver libraries';
        this.loading = false;
      }
    });
  }

  selectLibrary(id: string): void {
    this.selectedId = id;
    this.router.navigate([id], { relativeTo: this.route });
  }

  onAddNew(): void {
    this.selectedId = null;
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  onDelete(): void {
    if (!this.selectedId) return;
    
    if (confirm('Are you sure you want to delete this receiver library?')) {
      this.service.delete(this.selectedId).subscribe({
        next: () => {
          this.loadLibraries();
          this.selectedId = null;
          this.router.navigate(['/receiver-library'], { relativeTo: this.route.parent });
        },
        error: (err) => {
          alert(err?.message || 'Failed to delete receiver library');
        }
      });
    }
  }

  isSelected(id: string): boolean {
    return this.selectedId === id;
  }

  get hasActiveChildRoute(): boolean {
    return !!this.route.firstChild;
  }
}
