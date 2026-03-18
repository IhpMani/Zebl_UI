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
          if (!this.isTabbableRoute(path)) return;
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
    const existing = state.tabs.find((t) => this.isSameTarget(t, route, params));

    if (existing) {
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

  private generateTitle(path: string, params: Record<string, unknown>): string {
    const segs = path.split('/').filter(Boolean);
    const first = segs[0] ?? '';
    if (first === 'claims') {
      return 'Loading...';
    }
    if (first === 'patients') {
      return 'Loading...';
    }
    if (first === 'edi' && segs[1] === 'reports') return 'EDI Reports';
    if (first === 'payments') return 'Payments';
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

  private isTabbableRoute(path: string): boolean {
    const normalized = path && path.startsWith('/') ? path : `/${path ?? ''}`;
    return !(
      normalized === '/' ||
      normalized === '/home' ||
      normalized === '/dashboard'
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

