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
      <div
        class="facility-switch-bar"
        *ngIf="auth.isLoggedIn() && !auth.isSuperAdmin()"
      >
        <label for="facility-select">Facility</label>
        <select
          id="facility-select"
          name="facility"
          [(ngModel)]="selectedFacilityId"
          (ngModelChange)="onFacilityChange($event)"
        >
          <option [ngValue]="null">Select facility…</option>
          <option *ngFor="let f of facilityOptions" [ngValue]="f.facilityId">
            {{ f.name }}
          </option>
        </select>
        <span class="facility-hint" *ngIf="facilityLoadError">{{ facilityLoadError }}</span>
        <span class="facility-hint warn" *ngIf="facilityOptionsLoaded && !selectedFacilityId && facilityOptions.length">
          Select facility to use the application.
        </span>
      </div>
      <div class="topbar">
        <img class="topbar-logo" src="assets/icons/broadbill.png" alt="Broadbill">
        <div class="topbar-spacer"></div>
        <div class="user-menu" *ngIf="auth.isLoggedIn()">
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
      </div>
      <app-ribbon (reviewIncoming)="onReviewIncoming()">
      </app-ribbon>
      <app-workspace-tabs *ngIf="auth.isLoggedIn() && !auth.isSuperAdmin() && !showInterfaceDataReview"></app-workspace-tabs>
      <div class="content-area">
        <app-interface-data-review *ngIf="showInterfaceDataReview"></app-interface-data-review>
        <div class="workspace-content" *ngIf="!showInterfaceDataReview">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app-shell.component.css']
})
export class AppShellComponent implements OnDestroy, OnInit {
  showMenu = false;
  showInterfaceDataReview = false;
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
        this.showInterfaceDataReview = false;
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
    this.showInterfaceDataReview = true;
  }

  onFacilityChange(id: number | null): void {
    if (id == null || id <= 0) {
      this.facility.clearFacilityStorage();
      this.selectedFacilityId = null;
    } else {
      try {
        this.facility.setFacilityId(id);
      } catch {
        this.selectedFacilityId = null;
        return;
      }
    }
    this.showInterfaceDataReview = false;
    this.contextReset.resetAppState();
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
  }
}
