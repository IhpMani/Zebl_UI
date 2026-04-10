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
      <div class="topbar">
        <div class="topbar-left">
          <img class="topbar-logo" src="assets/icons/broadbill.png" alt="Broadbill">
        </div>
        <div class="topbar-center">
          <div
            class="facility-inline"
            *ngIf="auth.isLoggedIn() && !auth.isSuperAdmin()"
          >
            <span class="facility-label" id="facility-label">Facility</span>
            <div class="facility-dropdown">
              <button
                type="button"
                class="facility-select-trigger"
                id="facility-trigger"
                [class.facility-select-trigger--open]="facilityMenuOpen"
                [attr.aria-expanded]="facilityMenuOpen"
                aria-haspopup="listbox"
                aria-labelledby="facility-label facility-trigger"
                (click)="toggleFacilityMenu($event)"
              >
                <span class="facility-select-label">{{ getSelectedFacilityLabel() }}</span>
                <span class="facility-select-chevron" aria-hidden="true"></span>
              </button>
              <div
                class="facility-select-panel"
                *ngIf="facilityMenuOpen"
                role="listbox"
                aria-labelledby="facility-label"
              >
                <button
                  type="button"
                  role="option"
                  class="facility-option"
                  [attr.aria-selected]="selectedFacilityId === null"
                  [class.facility-option--active]="selectedFacilityId === null"
                  (click)="pickFacility(null)"
                >
                  Select facility…
                </button>
                <button
                  type="button"
                  *ngFor="let f of facilityOptions"
                  role="option"
                  class="facility-option"
                  [attr.aria-selected]="selectedFacilityId === f.facilityId"
                  [class.facility-option--active]="selectedFacilityId === f.facilityId"
                  (click)="pickFacility(f.facilityId)"
                >
                  {{ f.name }}
                </button>
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
        </div>
        <div class="user-menu topbar-right" *ngIf="auth.isLoggedIn()">
          <div class="profile-icon" (click)="toggleMenu()">
            {{ getInitials() }}
          </div>
          <div class="dropdown" *ngIf="showMenu">
            <div class="menu-item username-display">
              {{ (auth.userName$ | async) || '' }}
            </div>
            <div class="menu-item divider" *ngIf="auth.getIsAdmin()"></div>
            <div class="menu-item" *ngIf="auth.getIsAdmin()" (click)="goToUserManagement()">User Management</div>
            <div class="menu-item" *ngIf="auth.isSuperAdmin()" (click)="goToSuperAdmin()">Super Admin</div>
            <div class="menu-item" *ngIf="auth.isImpersonating()" (click)="exitTenantView()">Exit tenant view</div>
            <div class="menu-item divider"></div>
            <div class="menu-item" (click)="resetPassword()">Reset Password</div>
            <div class="menu-item" (click)="logout()">Logout</div>
          </div>
        </div>
        <div class="topbar-right" *ngIf="!auth.isLoggedIn()"></div>
      </div>
      <app-ribbon (reviewIncoming)="onReviewIncoming()">
      </app-ribbon>
      <app-workspace-tabs *ngIf="auth.isLoggedIn() && !auth.isSuperAdmin()"></app-workspace-tabs>
      <div class="content-area">
        <div class="workspace-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app-shell.component.css']
})
export class AppShellComponent implements OnDestroy, OnInit {
  showMenu = false;
  facilityMenuOpen = false;
  selectedFacilityId: number | null = null;
  facilityOptions: OperationalFacilityRow[] = [];
  facilityLoadError: string | null = null;
  facilityOptionsLoaded = false;
  httpBanner: string | null = null;

  private navSub?: Subscription;
  private httpErrSub?: Subscription;

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
    this.httpErrSub = this.httpErrors.message$.subscribe((m) => {
      this.httpBanner = m;
    });
    if (this.auth.isLoggedIn() && !this.auth.isSuperAdmin()) {
      this.loadOperationalFacilities();
    }
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.httpErrSub?.unsubscribe();
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  onReviewIncoming(): void {
    void this.router.navigateByUrl('/interface-data-review');
  }

  onFacilityChange(id: number | null): void {
    if (id == null || id <= 0) {
      this.facility.clearFacilityStorage();
      this.selectedFacilityId = null;
    } else {
      try {
        this.facility.setFacilityId(id);
        this.selectedFacilityId = id;
      } catch {
        this.selectedFacilityId = null;
        return;
      }
    }
    this.contextReset.resetAppState();
  }

  getSelectedFacilityLabel(): string {
    if (this.selectedFacilityId == null) {
      return 'Select facility…';
    }
    const row = this.facilityOptions.find((r) => r.facilityId === this.selectedFacilityId);
    return row?.name ?? 'Select facility…';
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

  private loadOperationalFacilities(): void {
    this.facilityLoadError = null;
    if (!this.auth.isLoggedIn() || this.auth.isSuperAdmin()) {
      this.facilityOptions = [];
      this.facilityOptionsLoaded = false;
      return;
    }
    this.facilitiesApi.getMyFacilities().subscribe({
      next: (rows) => {
        this.facilityOptions = Array.isArray(rows) ? rows : [];
        this.facilityOptionsLoaded = true;
        const cur = this.facility.getFacilityIdOptional();
        if (cur != null && !this.facilityOptions.some((r) => r.facilityId === cur)) {
          this.facility.clearFacilityStorage();
          this.selectedFacilityId = null;
        } else {
          this.selectedFacilityId = cur;
        }
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
