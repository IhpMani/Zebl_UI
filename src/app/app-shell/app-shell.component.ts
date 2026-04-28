import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ClaimDetailsBootstrapCacheService } from '../core/services/claim-details-bootstrap-cache.service';
import { FacilityService } from '../core/services/facility.service';
import { ContextResetService } from '../core/services/context-reset.service';
import { FacilitiesApiService, OperationalFacilityRow } from '../core/services/facilities-api.service';
import { HttpErrorMessageService } from '../core/services/http-error-message.service';
import { SuperAdminService } from '../super-admin/super-admin.service';

@Component({
  selector: 'app-app-shell',
  template: `
    <div class="app-container">
      <div class="api-error-banner" *ngIf="httpBanner">{{ httpBanner }}</div>
      <div class="app-toast-container" *ngIf="toastVisible">
        <div class="app-toast">{{ toastMessage }}</div>
      </div>
      <div class="topbar">
        <div class="topbar-left">
          <span class="topbar-brand" aria-label="BroadBill">
            <span class="topbar-brand-main">Broad</span><span class="topbar-brand-accent">Bill</span>
          </span>
        </div>
        <div class="topbar-right"></div>
      </div>
      <div class="app-layout" [class.app-layout--collapsed]="sidebarCollapsed">
        <aside class="sidebar">
          <div
            class="facility-sidebar"
            *ngIf="auth.isLoggedIn() && !auth.isSuperAdmin() && !sidebarCollapsed"
          >
            <div class="facility-sidebar__top">
              <div class="facility-dropdown">
                <button
                  type="button"
                  class="facility-select-trigger"
                  id="facility-trigger"
                  [class.facility-select-trigger--open]="facilityMenuOpen"
                  [attr.aria-expanded]="facilityMenuOpen"
                  aria-haspopup="listbox"
                  aria-label="Facility"
                  (click)="toggleFacilityMenu($event)"
                >
                  <span class="facility-select-label">{{ getSelectedFacilityLabel() }}</span>
                  <span class="facility-select-chevron" aria-hidden="true"></span>
                </button>
                <div
                  class="facility-select-panel"
                  *ngIf="facilityMenuOpen"
                  role="listbox"
                  aria-label="Facility options"
                >
                  <button
                    type="button"
                    *ngFor="let f of facilityOptions"
                    role="option"
                    class="facility-option"
                    [attr.aria-selected]="isFacilitySelected(f.facilityId)"
                    [class.facility-option--active]="isFacilitySelected(f.facilityId)"
                    (click)="pickFacility(toFacilityId(f.facilityId))"
                  >
                    {{ f.name }}
                  </button>
                </div>
              </div>
            </div>
            <span class="facility-hint facility-hint--error" *ngIf="facilityLoadError">{{ facilityLoadError }}</span>
            <span
              class="facility-hint facility-hint--warn"
              *ngIf="facilityOptionsLoaded && !selectedFacilityId && facilityOptions.length"
            >
              Select facility to use the application.
            </span>
          </div>
          <app-ribbon
            (reviewIncoming)="onReviewIncoming()"
            (sidebarStateChange)="onSidebarStateChange($event)">
          </app-ribbon>
          <div class="sidebar-profile" *ngIf="auth.isLoggedIn()">
            <div class="user-menu">
              <div class="profile-icon" (click)="toggleMenu()">
                <span class="profile-initials">{{ getInitials() }}</span>
                <span class="profile-name" *ngIf="!sidebarCollapsed">{{ (auth.userName$ | async) || '' }}</span>
              </div>
              <div class="dropdown" *ngIf="showMenu">
                <div class="menu-item username-display">
                  {{ (auth.userName$ | async) || '' }}
                </div>
                <div class="menu-item" *ngIf="auth.getIsAdmin()" (click)="goToUserManagement()">User Management</div>
                <div class="menu-item" *ngIf="auth.isSuperAdmin()" (click)="goToSuperAdmin()">Super Admin</div>
                <div class="menu-item" *ngIf="auth.isImpersonating()" (click)="exitTenantView()">Exit tenant view</div>
                <div class="menu-item" (click)="resetPassword()">Reset Password</div>
                <div class="menu-item" (click)="logout()">Logout</div>
              </div>
            </div>
          </div>
        </aside>

        <main class="main-content">
          <app-workspace-tabs *ngIf="auth.isLoggedIn() && !auth.isSuperAdmin()"></app-workspace-tabs>
          <div class="content-container" [class.content-container--flat]="isReceiverLibraryRoute()">
            <div class="content-heading" *ngIf="showHomeDashboardHeading()">Home Dashboard</div>
            <div class="workspace-content" [class.workspace-content--flat]="isReceiverLibraryRoute()">
              <router-outlet></router-outlet>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styleUrls: ['./app-shell.component.css']
})
export class AppShellComponent implements OnDestroy, OnInit {
  showMenu = false;
  facilityMenuOpen = false;
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  selectedFacilityId: number | null = null;
  facilityOptions: OperationalFacilityRow[] = [];
  facilityLoadError: string | null = null;
  facilityOptionsLoaded = false;
  httpBanner: string | null = null;
  toastMessage: string | null = null;
  toastVisible = false;

  private navSub?: Subscription;
  private httpErrSub?: Subscription;
  private facilitiesLoadSub?: Subscription;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly originalAlert = window.alert.bind(window);

  constructor(
    public auth: AuthService,
    private router: Router,
    private claimDetailsCache: ClaimDetailsBootstrapCacheService,
    private facility: FacilityService,
    private contextReset: ContextResetService,
    private facilitiesApi: FacilitiesApiService,
    private httpErrors: HttpErrorMessageService,
    private superAdminApi: SuperAdminService
  ) {
    this.selectedFacilityId = this.facility.getFacilityIdOptional();
    if (this.auth.isLoggedIn()) {
      this.auth.syncOperationalContextFromJwt();
      if (!this.auth.isSuperAdmin()) {
        this.claimDetailsCache.preload();
      }
    }

    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.auth.isLoggedIn() && !this.auth.isSuperAdmin() && !e.url.includes('/login')) {
          this.loadOperationalFacilities();
        }
      });
  }

  ngOnInit(): void {
    this.installAlertProxy();
    this.httpErrSub = this.httpErrors.message$.subscribe((m) => {
      this.httpBanner = m;
    });
    if (this.auth.isLoggedIn() && !this.auth.isSuperAdmin()) {
      this.loadOperationalFacilities();
    }
  }

  ngOnDestroy(): void {
    window.alert = this.originalAlert;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.navSub?.unsubscribe();
    this.httpErrSub?.unsubscribe();
    this.facilitiesLoadSub?.unsubscribe();
  }

  private installAlertProxy(): void {
    window.alert = (message?: unknown): void => {
      const text = typeof message === 'string' ? message : String(message ?? '');
      this.showToast(text);
    };
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.toastMessage = null;
      this.toastTimer = null;
    }, 1000);
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  onReviewIncoming(): void {
    void this.router.navigateByUrl('/interface-data-review');
  }

  onSidebarStateChange(state: { collapsed: boolean; mobileOpen: boolean }): void {
    this.sidebarCollapsed = state.collapsed;
    this.mobileSidebarOpen = state.mobileOpen;
  }

  onFacilityChange(id: number | null): void {
    const n = id == null ? NaN : Math.floor(Number(id));
    if (id == null || !Number.isFinite(n) || n <= 0) {
      this.facility.clearFacilityStorage();
      this.selectedFacilityId = null;
    } else {
      try {
        this.facility.setFacilityId(n);
        this.selectedFacilityId = n;
      } catch {
        this.selectedFacilityId = null;
        return;
      }
    }
    this.contextReset.resetAppState();
  }

  getSelectedFacilityLabel(): string {
    const id = this.selectedFacilityId ?? this.facility.getFacilityIdOptional();
    if (id == null || id <= 0) {
      return 'Select facility…';
    }
    const row = this.facilityOptions.find((r) => this.sameFacilityId(r.facilityId, id));
    return row?.name ?? `Facility #${id}`;
  }

  toggleFacilityMenu(event: Event): void {
    event.stopPropagation();
    this.facilityMenuOpen = !this.facilityMenuOpen;
    if (this.facilityMenuOpen) {
      this.showMenu = false;
    }
  }

  pickFacility(id: number | null): void {
    this.onFacilityChange(id);
    this.facilityMenuOpen = false;
  }

  isFacilitySelected(facilityId: unknown): boolean {
    const id = this.selectedFacilityId ?? this.facility.getFacilityIdOptional();
    return id != null && this.sameFacilityId(facilityId, id);
  }

  toFacilityId(raw: unknown): number | null {
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  getInitials(): string {
    const userName = this.auth.getUserName();
    if (!userName) return '?';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.showMenu = false;
    this.auth.logout();
    this.facilityOptions = [];
    this.facilityOptionsLoaded = false;
    void this.router.navigateByUrl('/login');
  }

  goToUserManagement(): void {
    this.showMenu = false;
    void this.router.navigateByUrl('/admin/users');
  }

  goToSuperAdmin(): void {
    this.showMenu = false;
    void this.router.navigateByUrl('/super-admin');
  }

  exitTenantView(): void {
    this.showMenu = false;
    this.superAdminApi.exitImpersonation().subscribe({
      next: (res) => {
        this.auth.applySuperAdminSession(res);
        void this.router.navigateByUrl('/super-admin');
      },
      error: () => {
        this.httpErrors.show('Could not restore super-admin session.');
      },
    });
  }

  resetPassword(): void {
    this.showMenu = false;
    alert('Reset Password feature - to be implemented');
  }

  showHomeDashboardHeading(): boolean {
    return false;
  }

  isReceiverLibraryRoute(): boolean {
    return this.router.url.startsWith('/receiver-library');
  }

  /** Compare facility ids from API/storage without strict === (avoids string/number mismatch). */
  private sameFacilityId(a: unknown, b: unknown): boolean {
    const na = Math.floor(Number(a));
    const nb = Math.floor(Number(b));
    if (!Number.isFinite(na) || !Number.isFinite(nb) || na <= 0 || nb <= 0) {
      return false;
    }
    return na === nb;
  }

  private loadOperationalFacilities(): void {
    this.facilityLoadError = null;
    if (!this.auth.isLoggedIn() || this.auth.isSuperAdmin()) {
      this.facilityOptions = [];
      this.facilityOptionsLoaded = false;
      return;
    }
    this.facilitiesLoadSub?.unsubscribe();
    this.facilitiesLoadSub = this.facilitiesApi.getMyFacilities().subscribe({
      next: (rows) => {
        this.facilityOptions = Array.isArray(rows) ? rows : [];
        this.facilityOptionsLoaded = true;
        let cur = this.facility.getFacilityIdOptional();
        if (cur != null) {
          const inList = this.facilityOptions.some((r) => this.sameFacilityId(r.facilityId, cur));
          if (this.facilityOptions.length > 0 && !inList) {
            this.facility.clearFacilityStorage();
            this.selectedFacilityId = null;
            cur = null;
          } else if (this.facilityOptions.length === 0) {
            this.facility.clearFacilityStorage();
            this.selectedFacilityId = null;
            cur = null;
          }
        }
        if (this.facilityOptions.length === 1 && cur == null) {
          const onlyId = Math.floor(Number(this.facilityOptions[0].facilityId));
          if (Number.isFinite(onlyId) && onlyId > 0) {
            this.onFacilityChange(onlyId);
          }
          return;
        }
        this.selectedFacilityId = cur ?? this.facility.getFacilityIdOptional();
      },
      error: () => {
        this.facilityLoadError = 'Could not load facilities.';
        this.facilityOptionsLoaded = true;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.showMenu = false;
    }
    if (!target.closest('.facility-dropdown')) {
      this.facilityMenuOpen = false;
    }
  }
}
