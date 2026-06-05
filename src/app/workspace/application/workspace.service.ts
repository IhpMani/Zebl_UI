import { Inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable, filter } from 'rxjs';
import { TabType, WorkspaceTab } from '../domain/workspace-tab.model';
import { initialWorkspaceState, WorkspaceState } from './workspace.state';
import { WORKSPACE_REPOSITORY, WorkspaceRepository } from './workspace.repository';

@Injectable()
export class WorkspaceService {
  private readonly stateSubject = new BehaviorSubject<WorkspaceState>(
    initialWorkspaceState
  );

  readonly state$: Observable<WorkspaceState> = this.stateSubject.asObservable();

  private suppressNextNavigationHandling = false;
  private isHandlingNavigation = false;

  constructor(
    @Inject(WORKSPACE_REPOSITORY) private readonly repo: WorkspaceRepository,
    private readonly router: Router
  ) {
    const restored = this.repo.restoreTabs();
    if (restored) {
      const normalized = this.normalizeRestored(restored.tabs, restored.activeTabId);
      this.stateSubject.next(normalized);
    }

    // Sync tabs with router navigation
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.suppressNextNavigationHandling) {
          this.suppressNextNavigationHandling = false;
          return;
        }
        this.isHandlingNavigation = true;
        try {
          const { path, params } = this.extractRouteAndParams();
          if (!this.isTabbableRoute(path)) {
            this.clearActiveTabForBaseRoute();
            return;
          }
          const title = this.generateTitle(path, params);
          const tabType = this.deriveTabType(path);
          this.openTab(path, title, params, tabType);
        } finally {
          this.isHandlingNavigation = false;
        }
      });
  }

  openTab(
    route: string,
    title: string,
    params?: Record<string, unknown>,
    tabType: TabType = 'generic'
  ): WorkspaceTab {
    if (!this.isTabbableRoute(route)) {
      // Home/dashboard are base workspace screens, never tabs.
      return {
        id: 'base',
        title,
        route,
        params,
        tabType,
        isActive: false,
        isDirty: false,
        createdAt: new Date().toISOString()
      };
    }

    const state = this.stateSubject.value;
    const existing = this.findExistingTabForNavigation(route, params ?? {});

    if (existing) {
      const reuseSingleTabForLibrary =
        this.isConnectionLibraryPath(route) || this.isPayerLibraryPath(route);
      const reuseSingleTabForPatientWorkspace =
        this.isPatientWorkspacePath(route) && this.isPatientWorkspacePath(existing.route);

      if (reuseSingleTabForLibrary || reuseSingleTabForPatientWorkspace) {
        const resolvedTitle = this.resolveTabTitleOnReuse(existing.title, title);
        // One workspace tab for Connection/Payer Library or patient workspace (overview/claims/payments).
        const nextTabs = state.tabs.map((t) =>
          t.id === existing.id
            ? {
                ...t,
                route,
                params: params ?? {},
                title: resolvedTitle,
                tabType: tabType || t.tabType,
                isActive: true
              }
            : { ...t, isActive: false }
        );
        this.commit({ tabs: nextTabs, activeTabId: existing.id });
        if (this.isHandlingNavigation) {
          // Route already applied; only sync tab chrome.
          return this.getTabById(existing.id)!;
        }
        this.activateTab(existing.id);
        return this.getTabById(existing.id)!;
      }

      // If caller provides a more specific tab type, apply it (title/dup logic stays route+params based)
      if (tabType && existing.tabType !== tabType) {
        const nextTabs = state.tabs.map((t) =>
          t.id === existing.id ? { ...t, tabType } : t
        );
        this.commit({ ...state, tabs: nextTabs });
      }
      // If we are responding to a router event, set active without navigating again
      if (this.isHandlingNavigation) {
        this.setActive(existing.id, /*navigate*/ false);
      } else {
        this.activateTab(existing.id);
      }
      return this.getTabById(existing.id)!;
    }

    const now = new Date().toISOString();
    const tab: WorkspaceTab = {
      id: this.newId(),
      title,
      route,
      params,
      tabType,
      isActive: true,
      isDirty: false,
      createdAt: now
    };

    const nextTabs = state.tabs.map((t) => ({ ...t, isActive: false })).concat(tab);
    const next: WorkspaceState = { tabs: nextTabs, activeTabId: tab.id };

    this.commit(next);
    return tab;
  }

  updateTabTitle(tabId: string, title: string): void {
    const state = this.stateSubject.value;
    const existing = state.tabs.find((t) => t.id === tabId);
    if (!existing) return;
    if (existing.title === title) return;

    const nextTabs = state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t));
    this.commit({ ...state, tabs: nextTabs });
  }

  updateActiveTabTitle(title: string): void {
    const state = this.stateSubject.value;
    if (!state.activeTabId) return;
    this.updateTabTitle(state.activeTabId, title);
  }

  closeCurrentTab(): void {
    const state = this.stateSubject.value;
    if (!state.activeTabId) return;
    this.closeTab(state.activeTabId);
  }

  /**
   * Removes the tab for a route without navigating. Call before router.navigate to home (or other
   * non-tabbable targets) so the tab bar does not keep a stale active tab.
   */
  dismissTabForRoute(route: string): void {
    const normalized = route.startsWith('/') ? route : `/${route}`;
    const state = this.stateSubject.value;
    const closing = state.tabs.find((t) => t.route === normalized);
    if (!closing) return;

    const remaining = state.tabs.filter((t) => t.id !== closing.id);
    const wasActive = state.activeTabId === closing.id;
    let nextActiveId = wasActive ? null : state.activeTabId;
    if (nextActiveId && !remaining.some((t) => t.id === nextActiveId)) {
      nextActiveId = null;
    }

    const nextTabs = remaining.map((t) => ({
      ...t,
      isActive: nextActiveId != null && t.id === nextActiveId
    }));
    this.commit({ tabs: nextTabs, activeTabId: nextActiveId });

    if (nextTabs.length === 0) {
      this.navigateToHome();
    }
  }

  closeTab(tabId: string): void {
    const state = this.stateSubject.value;
    const closing = state.tabs.find((t) => t.id === tabId);
    if (!closing) return;

    let nextActiveId: string | null = state.activeTabId;
    if (state.activeTabId === tabId) {
      nextActiveId = this.pickPreviousTabId(state.tabs, tabId);
    }

    const remaining = state.tabs.filter((t) => t.id !== tabId);
    if (nextActiveId && !remaining.some((t) => t.id === nextActiveId)) {
      nextActiveId = this.pickLastOpened(remaining)?.id ?? null;
    }

    const nextTabs = remaining.map((t) => ({
      ...t,
      isActive: nextActiveId != null && t.id === nextActiveId
    }));

    this.commit({ tabs: nextTabs, activeTabId: nextActiveId });

    if (nextTabs.length === 0) {
      this.navigateToHome();
      return;
    }

    // If a new active tab was chosen after closing, navigate to it
    if (nextActiveId) {
      const active = nextTabs.find((t) => t.id === nextActiveId)!;
      this.navigateToTab(active);
    }
  }

  activateTab(tabId: string): void {
    const state = this.stateSubject.value;
    const target = state.tabs.find((t) => t.id === tabId);
    if (!target) return;

    this.setActive(tabId, /*navigate*/ true);
  }

  get activeTab(): WorkspaceTab | null {
    const state = this.stateSubject.value;
    if (!state.activeTabId) return null;
    return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
  }

  get tabs(): WorkspaceTab[] {
    return this.stateSubject.value.tabs;
  }

  /** Clears all workspace tabs and persistence. Call before navigating to home after facility/tenant change. */
  clearAllTabs(): void {
    this.suppressNextNavigationHandling = true;
    this.commit({ ...initialWorkspaceState });
  }

  private commit(next: WorkspaceState): void {
    this.stateSubject.next(next);
    this.repo.saveTabs({ tabs: next.tabs, activeTabId: next.activeTabId });
  }

  private setActive(tabId: string, navigate: boolean): void {
    const state = this.stateSubject.value;
    if (state.activeTabId === tabId && !navigate) return;
    const nextTabs = state.tabs.map((t) => ({ ...t, isActive: t.id === tabId }));
    const next: WorkspaceState = { tabs: nextTabs, activeTabId: tabId };
    this.commit(next);
    if (navigate) {
      const tab = nextTabs.find((t) => t.id === tabId)!;
      this.navigateToTab(tab);
    }
  }

  private navigateToTab(tab: WorkspaceTab): void {
    this.suppressNextNavigationHandling = true;
    this.router.navigate([tab.route], { queryParams: tab.params ?? {} });
  }

  /** When all workspace tabs are closed, return to the home route. */
  private navigateToHome(): void {
    this.suppressNextNavigationHandling = true;
    void this.router.navigate(['/']).catch(() => {
      // Ignore cancel/redirect races; avoids unhandled promise rejection.
    });
  }

  private isSameTarget(
    tab: WorkspaceTab,
    route: string,
    params?: Record<string, unknown>
  ): boolean {
    return tab.route === route && this.stableStringify(tab.params) === this.stableStringify(params);
  }

  private stableStringify(v: unknown): string {
    if (v === undefined) return '';
    if (v === null) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map((x) => this.stableStringify(x)).join(',')}]`;

    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${this.stableStringify(obj[k])}`).join(',')}}`;
  }

  private pickLastOpened(tabs: WorkspaceTab[]): WorkspaceTab | undefined {
    return tabs
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .at(-1);
  }

  private pickPreviousTabId(tabs: WorkspaceTab[], closingId: string): string | null {
    const idx = tabs.findIndex((t) => t.id === closingId);
    if (idx < 0) return null;
    const prev = tabs[idx - 1];
    if (prev) return prev.id;
    const next = tabs[idx + 1];
    return next?.id ?? null;
  }

  /** Connection Library uses child routes; keep a single workspace tab for the whole module. */
  private isConnectionLibraryPath(path: string): boolean {
    const n = path && path.startsWith('/') ? path : `/${path ?? ''}`;
    return n === '/connection-library' || n.startsWith('/connection-library/');
  }

  /** Payer Library uses the same single-tab pattern as Connection Library (list + :id / new). */
  private isPayerLibraryPath(path: string): boolean {
    const n = path && path.startsWith('/') ? path : `/${path ?? ''}`;
    return n === '/payer-library' || n.startsWith('/payer-library/');
  }

  /** Patient workspace uses one tab per patient across overview/claims/payments child routes. */
  private isPatientWorkspacePath(path: string): boolean {
    const n = path && path.startsWith('/') ? path : `/${path ?? ''}`;
    return /^\/patients\/\d+\/workspace(\/|$)/.test(n);
  }

  private patientWorkspacePatId(path: string): number | null {
    const n = path && path.startsWith('/') ? path : `/${path ?? ''}`;
    const m = n.match(/^\/patients\/(\d+)\/workspace/);
    if (!m?.[1]) return null;
    const id = Number(m[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  /** Do not replace a resolved patient name with the generic placeholder on sub-tab navigation. */
  private resolveTabTitleOnReuse(existingTitle: string, nextTitle: string): string {
    if (nextTitle !== 'Loading...') return nextTitle;
    if (existingTitle && existingTitle !== 'Loading...') return existingTitle;
    return nextTitle;
  }

  private findExistingTabForNavigation(route: string, params: Record<string, unknown>): WorkspaceTab | undefined {
    const state = this.stateSubject.value;
    if (this.isConnectionLibraryPath(route)) {
      return state.tabs.find((t) => this.isConnectionLibraryPath(t.route));
    }
    if (this.isPayerLibraryPath(route)) {
      return state.tabs.find((t) => this.isPayerLibraryPath(t.route));
    }
    const patientPatId = this.patientWorkspacePatId(route);
    if (patientPatId != null) {
      return state.tabs.find((t) => this.patientWorkspacePatId(t.route) === patientPatId);
    }
    return state.tabs.find((t) => this.isSameTarget(t, route, params));
  }

  private normalizeRestored(tabs: WorkspaceTab[], activeTabId: string | null): WorkspaceState {
    const existingActive =
      activeTabId && tabs.some((t) => t.id === activeTabId) ? activeTabId : null;
    const fallback = existingActive ?? this.pickLastOpened(tabs)?.id ?? null;

    return {
      tabs: tabs.map((t) => ({ ...t, isActive: fallback != null && t.id === fallback })),
      activeTabId: fallback
    };
  }

  private extractRouteAndParams(): { path: string; params: Record<string, unknown> } {
    // Build absolute path from the deepest activated route's URL segments
    let node = this.router.routerState.snapshot.root;
    while (node.firstChild) node = node.firstChild;
    const segments = node.pathFromRoot
      .flatMap((r) => r.url.map((u) => u.path))
      .filter((s) => s && s.length > 0);
    const path = '/' + segments.join('/');

    const routeParams = node.params ?? {};
    const queryParams = this.router.routerState.snapshot.root.queryParams ?? {};
    const params = { ...queryParams, ...routeParams };
    return { path, params };
  }

  private static readonly ROUTE_TITLES: Record<string, string> = {
    '/claims/find-claim': 'Find Claims',
    '/claims/operations': 'Claims Command Center',
    '/claims/send': 'Send Claims',
    '/claims/rejections': 'Claim Rejections',
    '/patients': 'Patient Lookup',
    '/patients/find-patient': 'Find Patients',
    '/patients/lookup': 'Patient Lookup',
    '/patients/workspace-preview': 'Patient Workspace (Preview)',
    '/services/find-service': 'Find Services',
    '/payments/find-payment': 'Find Payments',
    '/payments/ledger': 'Payments Ledger',
    '/payments/entry': 'Payment Entry',
    '/payments/era-exceptions': 'ERA Exceptions',
    '/adjustments/find-adjustment': 'Find Adjustments',
    '/payers/find-payer': 'Find Payers',
    '/physicians/find-physician': 'Find Physicians',
    '/physicians': 'Physician Library',
    '/disbursements/find-disbursement': 'Find Disbursements',
    '/claim-notes/find-claim-note': 'Find Claim Notes',
    '/edi-reports': 'EDI Reports',
    '/interface-data-review': 'Review Incoming',
    '/procedure-codes': 'Procedure Codes',
    '/libraries/procedure-codes': 'Procedure Code Library',
    '/libraries/city-state-zip': 'City State Zip Library',
    '/receiver-library': 'Receiver Library',
    '/connection-library': 'Connection Library',
    '/payer-library': 'Payer Library',
    '/code-library': 'Code Library',
    '/claim-template-library': 'Claim Template Library',
    '/tools/program-setup': 'Program Setup',
    '/admin/users': 'Users',
    '/admin/facilities': 'Facilities',
    '/lists': 'Lists'
  };

  private generateTitle(path: string, params: Record<string, unknown>): string {
    const staticTitle = WorkspaceService.ROUTE_TITLES[path];
    if (staticTitle) return staticTitle;

    const segs = path.split('/').filter(Boolean);
    const first = segs[0] ?? '';

    // Detail pages with a dynamic ID param → placeholder until component loads data
    if (first === 'claims' && segs.length >= 2) return 'Loading...';
    if (first === 'patients' && segs.length >= 2) return 'Loading...';
    if (first === 'payments' && segs[1] === 'entry' && segs.length >= 3) return 'Loading...';

    if (first === 'connection-library' && segs.length >= 2) {
      const leaf = segs[1] ?? '';
      if (leaf === 'new') return 'Connection Library — New';
      return 'Connection Library';
    }

    if (first === 'payer-library' && segs.length >= 2) {
      const leaf = segs[1] ?? '';
      if (leaf === 'new') return 'Payer Library — New';
      return 'Payer Library';
    }

    if (first === 'edi-reports' && segs.length >= 3 && segs[2] === 'review') {
      return 'ERA Payment Review';
    }

    const last = segs.at(-1) ?? 'Tab';
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  private deriveTabType(path: string): TabType {
    const segs = path.split('/').filter(Boolean);
    const first = segs[0] ?? '';
    if (first === 'patients') return 'patient';
    if (first === 'claims') return 'claim';
    if (first === 'edi' || first === 'edi-reports') return 'report';
    if (first === 'reports') return 'report';
    return 'generic';
  }

  /** Home / dashboard URLs are not tied to a workspace tab; clear any stale active highlight. */
  private clearActiveTabForBaseRoute(): void {
    const state = this.stateSubject.value;
    const needsUpdate =
      state.activeTabId != null || state.tabs.some((t) => t.isActive);
    if (!needsUpdate) return;

    const nextTabs = state.tabs.map((t) => ({ ...t, isActive: false }));
    this.commit({ tabs: nextTabs, activeTabId: null });
  }

  private isTabbableRoute(path: string): boolean {
    const normalized = path && path.startsWith('/') ? path : `/${path ?? ''}`;
    return !(
      normalized === '/' ||
      normalized === '/home' ||
      normalized === '/dashboard' ||
      normalized === '/libraries' // redirect-only (→ home); not a real screen
    );
  }

  private getTabById(tabId: string): WorkspaceTab | undefined {
    return this.stateSubject.value.tabs.find((t) => t.id === tabId);
  }

  private newId(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof (c as any).randomUUID === 'function') return (c as any).randomUUID();
    return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

