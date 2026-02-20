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

  constructor(
    private service: ReceiverLibraryService,
    public router: Router,
    public route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadLibraries();
    
    // Track route changes to update selected ID
    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const childRoute = this.route.firstChild;
      if (childRoute) {
        const idParam = childRoute.snapshot.paramMap.get('id');
        this.selectedId = idParam === 'new' ? null : idParam;
      } else {
        this.selectedId = null;
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
  }

  loadLibraries(): void {
    this.loading = true;
    this.error = null;
    this.service.getAll().subscribe({
      next: (data) => {
        this.libraries = data;
        this.loading = false;
        // Select first item if available
        if (this.libraries.length > 0 && !this.selectedId) {
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
