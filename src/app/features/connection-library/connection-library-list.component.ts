import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ConnectionLibraryService } from './connection-library.service';
import { ConnectionLibraryDto } from '../../core/services/connection-library-api.service';

@Component({
  selector: 'app-connection-library-list',
  templateUrl: './connection-library-list.component.html',
  styleUrls: ['./connection-library-list.component.scss']
})
export class ConnectionLibraryListComponent implements OnInit, OnDestroy {
  connections: ConnectionLibraryDto[] = [];
  selectedId: string | null = null;
  loading = false;
  error: string | null = null;
  private routeSub?: Subscription;

  constructor(
    private service: ConnectionLibraryService,
    public router: Router,
    public route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadConnections();
    
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

  loadConnections(): void {
    this.loading = true;
    this.error = null;
    this.service.getAll().subscribe({
      next: (data) => {
        this.connections = data;
        this.loading = false;
        // Select first item if available and no selection
        const childId = this.route.firstChild?.snapshot?.paramMap?.get('id');
        if (this.connections.length > 0 && !this.selectedId && childId !== 'new') {
          this.selectConnection(this.connections[0].id);
        }
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load connection libraries';
        this.loading = false;
      }
    });
  }

  selectConnection(id: string): void {
    this.selectedId = id;
    this.router.navigate([id], { relativeTo: this.route });
  }

  onAddNew(): void {
    this.selectedId = null;
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  isSelected(id: string): boolean {
    return this.selectedId === id;
  }

  get hasActiveChildRoute(): boolean {
    return !!this.route.firstChild;
  }
}
