import { Injectable, Inject, Optional } from '@angular/core';
import { RouteReuseStrategy, Router } from '@angular/router';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { WorkspaceRouteReuseStrategy } from '../../workspace/infrastructure/workspace-route-reuse-strategy';
import { ClaimDetailsBootstrapCacheService } from './claim-details-bootstrap-cache.service';
import { CustomFieldsApiService } from './custom-fields-api.service';
import { EdiReportCountService } from './edi-report-count.service';
import { ListApiService } from './list-api.service';
import { PayerApiService } from './payer-api.service';
import { RibbonContextService } from './ribbon-context.service';

/**
 * Resets client state when facility, tenant, or user changes so tabs, reused routes, and HTTP caches cannot show stale data.
 */
@Injectable({ providedIn: 'root' })
export class ContextResetService {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly router: Router,
    private readonly claimBootstrap: ClaimDetailsBootstrapCacheService,
    private readonly listApi: ListApiService,
    private readonly payerApi: PayerApiService,
    private readonly customFieldsApi: CustomFieldsApiService,
    private readonly ribbonContext: RibbonContextService,
    private readonly ediReportCount: EdiReportCountService,
    @Optional() @Inject(RouteReuseStrategy) private readonly routeReuse: RouteReuseStrategy | null
  ) {}

  /**
   * Clears in-memory client caches without navigation. Use on logout/login and impersonation handoffs.
   */
  clearAllClientCaches(): void {
    const reuse = this.routeReuse;
    if (reuse instanceof WorkspaceRouteReuseStrategy) {
      reuse.clearDetachedRoutes();
    }

    this.workspace.clearAllTabs();
    this.claimBootstrap.reset();
    this.listApi.clearResponseCache();
    this.payerApi.clearResponseCache();
    this.customFieldsApi.clearResponseCache();
    this.ribbonContext.clearContext();
    this.ediReportCount.setCount(0);
  }

  resetAppState(): void {
    this.clearAllClientCaches();
    void this.router.navigate(['/dashboard']).then(() => {
      this.claimBootstrap.preload();
    });
  }
}
