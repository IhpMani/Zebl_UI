import { Injectable, Inject, Optional } from '@angular/core';
import { RouteReuseStrategy, Router } from '@angular/router';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { WorkspaceRouteReuseStrategy } from '../../workspace/infrastructure/workspace-route-reuse-strategy';
import { ClaimDetailsBootstrapCacheService } from './claim-details-bootstrap-cache.service';

/**
 * Resets client state when facility or tenant context changes so tabs and cached routes cannot show stale data.
 */
@Injectable({ providedIn: 'root' })
export class ContextResetService {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly router: Router,
    private readonly claimBootstrap: ClaimDetailsBootstrapCacheService,
    @Optional() @Inject(RouteReuseStrategy) private readonly routeReuse: RouteReuseStrategy | null
  ) {}

  resetAppState(): void {
    const reuse = this.routeReuse;
    if (reuse instanceof WorkspaceRouteReuseStrategy) {
      reuse.clearDetachedRoutes();
    }

    this.workspace.clearAllTabs();
    this.claimBootstrap.reset();
    void this.router.navigate(['/dashboard']).then(() => {
      this.claimBootstrap.preload();
    });
  }
}
