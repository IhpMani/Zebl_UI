import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class WorkspaceRouteReuseStrategy implements RouteReuseStrategy {
  private readonly handlers = new Map<string, DetachedRouteHandle>();

  /** Drop cached route handles (e.g. after facility/tenant switch) so components are not reused with stale data. */
  clearDetachedRoutes(): void {
    this.handlers.clear();
  }

  /**
   * Remove detached tabs for routes under a path prefix (e.g. "/payments/entry").
   * Keys are built as "/path/to/route?{params}" — compare the path segment before "?".
   */
  removeDetachedRoutesForPathPrefix(pathPrefix: string): void {
    const norm = pathPrefix.startsWith('/') ? pathPrefix : `/${pathPrefix}`;
    for (const key of [...this.handlers.keys()]) {
      const pathOnly = key.split('?')[0];
      if (pathOnly === norm || pathOnly.startsWith(`${norm}/`)) {
        this.handlers.delete(key);
      }
    }
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Cache only leaf routes that render a component (or standalone component).
    if (route.firstChild) return false;
    const cfg = route.routeConfig;
    if (!cfg) return false;
    if (!cfg.component && !cfg.loadComponent) return false;
    if (cfg.path === 'login') return false;
    return true;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    const key = this.getKey(route);
    this.handlers.set(key, handle);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    if (route.firstChild) return false;
    return this.handlers.has(this.getKey(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (route.firstChild) return null;
    return this.handlers.get(this.getKey(route)) ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Reuse when the route config is same AND params match (so /claims/1023 != /claims/1024)
    return (
      future.routeConfig === curr.routeConfig &&
      this.getKey(future) === this.getKey(curr)
    );
  }

  private getKey(route: ActivatedRouteSnapshot): string {
    const segments = route.pathFromRoot
      .flatMap((r) => r.url.map((u) => u.path))
      .filter((s) => s && s.length > 0);
    const path = '/' + segments.join('/');

    const params = { ...(route.queryParams ?? {}), ...(route.params ?? {}) };
    return `${path}?${this.stableStringify(params)}`;
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
}

