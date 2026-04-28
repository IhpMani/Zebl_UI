import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  isCollapsed = false;
  activeMenu: string | null = null;
  hoverMenu: string | null = null;
  panelTop = 0;

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  setActiveMenu(menu: string | null, panelTop = 0): void {
    this.activeMenu = menu;
    this.panelTop = panelTop;
  }

  setHoverMenu(menu: string | null): void {
    this.hoverMenu = menu;
  }
}
