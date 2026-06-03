import { Injectable, Inject, Optional } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { WorkspaceRouteReuseStrategy } from '../../workspace/infrastructure/workspace-route-reuse-strategy';
import { ClaimDetailsBootstrapCacheService } from './claim-details-bootstrap-cache.service';
import { CustomFieldsApiService } from './custom-fields-api.service';
import { EdiReportCountService } from './edi-report-count.service';
import { Era835ReviewReturnCacheService } from './era835-review-return-cache.service';
import { ListApiService } from './list-api.service';
import { PayerApiService } from './payer-api.service';
import { RibbonContextService } from './ribbon-context.service';
import { ClaimShellCacheService } from '../../features/claims/services/claim-shell-cache.service';
import { PatientWorkspaceQueryService } from '../../features/patients/services/queries/patient-workspace-query.service';

/**
 * Resets client state when facility, tenant, or user changes so tabs, reused routes, and HTTP caches cannot show stale data.
 */
@Injectable({ providedIn: 'root' })
export class ContextResetService {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly claimBootstrap: ClaimDetailsBootstrapCacheService,
    private readonly listApi: ListApiService,
    private readonly payerApi: PayerApiService,
    private readonly customFieldsApi: CustomFieldsApiService,
    private readonly ribbonContext: RibbonContextService,
    private readonly ediReportCount: EdiReportCountService,
    private readonly claimShellCache: ClaimShellCacheService,
    private readonly patientWorkspaceQueries: PatientWorkspaceQueryService,
    private readonly era835ReviewReturnCache: Era835ReviewReturnCacheService,
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
    this.claimShellCache.invalidateAll();
    this.patientWorkspaceQueries.invalidateAll();
    this.era835ReviewReturnCache.clearAll();
    this.clearPersistedScopedState();
  }

  /**
   * Clears caches and reloads the whole app on `/dashboard` so every service re-inits with the new `X-Facility-Id`.
   * (SPA router navigation alone leaves some singleton state; full `location.assign` matches a refresh.)
   */
  resetAppState(): void {
    this.clearAllClientCaches();
    window.location.assign('/dashboard');
  }

  private clearPersistedScopedState(): void {
    const prefixes = [
      'bb.patientWorkspace.',
      'zebl:eligibility:lastRequestId:pat:',
      ':bb.patientWorkspace.',
      ':zebl:eligibility:lastRequestId:pat:'
    ];

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (prefixes.some((prefix) => key.includes(prefix))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }
}
