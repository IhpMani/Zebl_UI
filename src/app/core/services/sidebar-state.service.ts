import { Injectable } from '@angular/core';

const SIDEBAR_STORAGE_KEY = 'zebl.sidebar.expanded';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  /** Ribbon narrow mode (icon-only labels hidden). */
  isCollapsed = false;
  activeMenu: string | null = null;
  hoverMenu: string | null = null;
  panelTop = 0;

  /** Shell: sidebar panel visible (off-screen when false on desktop). */
  private shellVisible = true;
  mobileDrawerOpen = false;
  isMobile = false;

  constructor() {
    this.shellVisible = this.loadShellVisible();
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.isMobile = window.matchMedia('(max-width: 991px)').matches;
      window.matchMedia('(max-width: 991px)').addEventListener('change', (e) => {
        this.isMobile = e.matches;
        this.mobileDrawerOpen = false;
      });
    }
  }

  get isExpanded(): boolean {
    return this.shellVisible;
  }

  get menuOpenVisual(): boolean {
    return this.isMobile ? this.mobileDrawerOpen : this.shellVisible;
  }

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleFromMenuButton(): void {
    if (this.isMobile) {
      this.mobileDrawerOpen = !this.mobileDrawerOpen;
      return;
    }
    this.shellVisible = !this.shellVisible;
    this.persistShellVisible();
  }

  closeMobileDrawer(): void {
    this.mobileDrawerOpen = false;
  }

  setActiveMenu(menu: string | null, panelTop = 0): void {
    this.activeMenu = menu;
    this.panelTop = panelTop;
  }

  setHoverMenu(menu: string | null): void {
    this.hoverMenu = menu;
  }

  private loadShellVisible(): boolean {
    try {
      const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (raw === '0' || raw === 'false') return false;
      if (raw === '1' || raw === 'true') return true;
    } catch {
      /* ignore */
    }
    return true;
  }

  private persistShellVisible(): void {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, this.shellVisible ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
}
