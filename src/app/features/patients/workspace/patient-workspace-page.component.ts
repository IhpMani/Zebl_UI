import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PatientWorkspaceStateService } from '../services/patient-workspace-state.service';
import {
  DEFAULT_PATIENT_WORKSPACE_TAB,
  isPatientWorkspaceTabId,
  PATIENT_WORKSPACE_TABS,
  PatientWorkspaceTabId
} from '../models/patient-workspace-tab-id';
import { WorkspaceTabItem } from '../../../shared/layout/workspace/workspace-tabs/workspace-tabs.component';
import { WorkspaceService } from '../../../workspace/application/workspace.service';
import { PatientWorkspaceSessionService } from '../services/patient-workspace-session.service';
import { PatientWorkspacePersistenceService } from '../services/patient-workspace-persistence.service';
import { PatientNavigationService } from '../services/patient-navigation.service';
import { RibbonContextService } from '../../../core/services/ribbon-context.service';

@Component({
  selector: 'app-patient-workspace-page',
  templateUrl: './patient-workspace-page.component.html',
  styleUrls: ['./patient-workspace-page.component.css', './patient-workspace.polish.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientWorkspacePageComponent implements OnInit, OnDestroy {
  readonly tabDefs = PATIENT_WORKSPACE_TABS;
  workspaceTabs: WorkspaceTabItem[] = PATIENT_WORKSPACE_TABS.map((t) => ({
    id: t.id,
    label: t.label
  }));

  activeTabId: PatientWorkspaceTabId = DEFAULT_PATIENT_WORKSPACE_TAB;
  patId: number | null = null;
  header$ = this.state.header$;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly state: PatientWorkspaceStateService,
    private readonly workspace: WorkspaceService,
    private readonly navigation: PatientNavigationService,
    private readonly ribbonContext: RibbonContextService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params.get('patId'));
      if (!Number.isFinite(id) || id <= 0) return;
      this.patId = id;
      this.applyInitialTabTitle(id);
      this.state.openPatient(id);
      this.syncRibbonContext(id);

      const tabId = this.resolveTabFromUrl();
      this.activeTabId = tabId;
      this.state.setActiveTab(tabId);
    });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        if (this.isUrlForThisPatientWorkspace(e.urlAfterRedirects || e.url)) {
          this.syncTabTitleFromHeader();
        }
        const tabId = this.resolveTabFromUrl();
        this.activeTabId = tabId;
        this.state.setActiveTab(tabId);
      });

    this.state.header$.pipe(takeUntil(this.destroy$)).subscribe((h) => {
      if (!this.patId) return;
      this.syncTabTitleFromHeader();
      const raw = this.route.snapshot.queryParamMap.get('claimId');
      const claimId = raw ? Number(raw) : null;
      this.ribbonContext.setContext({
        patientId: this.patId,
        patientName: h?.patientName ?? this.ribbonContext.getContext().patientName ?? null,
        claimId: claimId != null && Number.isFinite(claimId) && claimId > 0 ? claimId : null
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(tabId: string): void {
    if (!isPatientWorkspaceTabId(tabId) || !this.patId) return;
    void this.router.navigate(this.navigation.patientWorkspaceRoute(this.patId, tabId));
  }

  private resolveTabFromUrl(): PatientWorkspaceTabId {
    const child = this.route.snapshot.firstChild;
    const seg = child?.url[0]?.path;
    return isPatientWorkspaceTabId(seg) ? seg : DEFAULT_PATIENT_WORKSPACE_TAB;
  }

  private syncRibbonContext(patId: number): void {
    const raw = this.route.snapshot.queryParamMap.get('claimId');
    const claimId = raw ? Number(raw) : null;
    const ctx = this.ribbonContext.getContext();
    this.ribbonContext.setContext({
      patientId: patId,
      patientName:
        this.state.getHeaderSnapshot()?.patientName ?? ctx.patientName ?? null,
      claimId: claimId != null && Number.isFinite(claimId) && claimId > 0 ? claimId : null
    });
  }

  /** Set tab title immediately (lookup row name) before header API returns. */
  private applyInitialTabTitle(patId: number): void {
    const ctx = this.ribbonContext.getContext();
    const fromHeader = this.state.getHeaderSnapshot()?.patientName?.trim();
    const fromCtx = ctx.patientId === patId ? ctx.patientName?.trim() : undefined;
    const title = fromHeader || fromCtx || `Patient ${patId}`;
    this.workspace.updateActiveTabTitle(title);
  }

  /** Keep workspace tab label in sync when route reuse resets it to "Loading...". */
  private syncTabTitleFromHeader(): void {
    if (!this.patId) return;
    const h = this.state.getHeaderSnapshot();
    const ctx = this.ribbonContext.getContext();
    const fromHeader = h?.patientName?.trim();
    const fromCtx = ctx.patientId === this.patId ? ctx.patientName?.trim() : undefined;
    const title = fromHeader || fromCtx || `Patient ${this.patId}`;
    this.workspace.updateActiveTabTitle(title);
  }

  private isUrlForThisPatientWorkspace(url: string): boolean {
    if (!this.patId) return false;
    const path = url.split('?')[0];
    return (
      path === `/patients/${this.patId}/workspace` ||
      path.startsWith(`/patients/${this.patId}/workspace/`)
    );
  }
}
