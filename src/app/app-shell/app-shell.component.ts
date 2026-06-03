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

import { SidebarStateService } from '../core/services/sidebar-state.service';

import { SuperAdminService } from '../super-admin/super-admin.service';
import { PatientNavigationService } from '../features/patients/services/patient-navigation.service';
import { ClaimApiService } from '../core/services/claim-api.service';
import { resolveClaimPatientId } from '../core/utils/claim-patient-id.util';



@Component({

  selector: 'app-app-shell',

  template: `

    <div class="app-container">

      <div class="api-error-banner" *ngIf="httpBanner">{{ httpBanner }}</div>

      <div class="app-toast-container" *ngIf="toastVisible">

        <div class="app-toast">{{ toastMessage }}</div>

      </div>



      <header class="topbar">

        <div class="topbar-left">

          <button

            type="button"

            class="topbar-menu-btn"

            [class.topbar-menu-btn--active]="sidebar.menuOpenVisual"

            (click)="toggleNavigation($event)"

            [attr.aria-expanded]="sidebar.menuOpenVisual"

            aria-controls="app-sidebar-rail"

            aria-label="Toggle navigation"

          >

            <span class="topbar-menu-btn__icon" aria-hidden="true">

              <span class="topbar-menu-btn__bar"></span>

              <span class="topbar-menu-btn__bar"></span>

              <span class="topbar-menu-btn__bar"></span>

            </span>

          </button>

          <span class="topbar-brand" aria-label="BroadBill">

            <span class="topbar-brand-main">Broad</span><span class="topbar-brand-accent">Bill</span>

          </span>

        </div>

        <div class="topbar-right" *ngIf="auth.isLoggedIn()">

          <button
            type="button"
            class="topbar-patient-lookup"
            *ngIf="!auth.isSuperAdmin()"
            (click)="openPatientLookup()"
            title="Patient Lookup (Ctrl+P)"
            aria-label="Patient Lookup"
          >
            <span class="topbar-patient-lookup__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"></path>
                <circle cx="8.5" cy="7.5" r="3"></circle>
                <circle cx="17.5" cy="16.5" r="4"></circle>
                <path d="m20.6 19.6 2.4 2.4"></path>
              </svg>
            </span>
          </button>

          <button
            type="button"
            class="topbar-patient-lookup"
            *ngIf="!auth.isSuperAdmin()"
            (click)="openPatientHome()"
            title="Patient"
            aria-label="Patient"
          >
            <span class="topbar-patient-lookup__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
          </button>

          <button
            type="button"
            class="topbar-patient-lookup"
            *ngIf="!auth.isSuperAdmin()"
            (click)="openClaimLookup()"
            title="Claim"
            aria-label="Claim"
          >
            <span class="topbar-patient-lookup__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
              </svg>
            </span>
          </button>

          <div class="topbar-facility" *ngIf="!auth.isSuperAdmin()">

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

                <div *ngIf="!facilityOptionsLoaded" class="facility-select-status">Loading facilities…</div>

                <ng-container *ngIf="facilityOptionsLoaded">

                  <button

                    type="button"

                    *ngFor="let f of facilityOptions; trackBy: trackFacility"

                    role="option"

                    class="facility-option"

                    [attr.aria-selected]="isFacilitySelected(f.facilityId)"

                    [class.facility-option--active]="isFacilitySelected(f.facilityId)"

                    (click)="pickFacility(toFacilityId(f.facilityId))"

                  >

                    {{ f.name.trim() }}

                  </button>

                  <div *ngIf="facilityOptions.length === 0" class="facility-select-status">

                    No facilities available for your account.

                  </div>

                </ng-container>

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

          <div class="topbar-profile">

            <div class="user-menu">

              <div class="profile-icon" (click)="toggleMenu()">

                <span class="profile-initials">{{ getInitials() }}</span>

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

        </div>

      </header>



      <div

        class="app-layout"

        [class.app-layout--sidebar-collapsed]="!sidebar.isExpanded"

        [class.app-layout--mobile-drawer-open]="sidebar.mobileDrawerOpen"

        [class.app-layout--mobile]="sidebar.isMobile"

      >

        <div

          class="sidebar-backdrop"

          *ngIf="sidebar.isMobile && sidebar.mobileDrawerOpen"

          (click)="sidebar.closeMobileDrawer()"

          aria-hidden="true"

        ></div>



        <aside class="sidebar" aria-label="Application navigation">
          <app-ribbon
            (reviewIncoming)="onReviewIncoming()"
            (sidebarStateChange)="onSidebarStateChange($event)">
          </app-ribbon>
        </aside>

        <main class="main-content">

          <app-workspace-chrome-tabs *ngIf="auth.isLoggedIn() && !auth.isSuperAdmin()"></app-workspace-chrome-tabs>

          <div class="content-container" [class.content-container--flat]="isReceiverLibraryRoute()">

            <div class="content-heading" *ngIf="showHomeDashboardHeading()">Home Dashboard</div>

            <div class="workspace-content" [class.workspace-content--flat]="isReceiverLibraryRoute()">

              <router-outlet></router-outlet>

            </div>

          </div>

        </main>

      </div>

      <app-workspace-slideover></app-workspace-slideover>
      <app-operational-toast-host></app-operational-toast-host>
      <app-broadbill-keyboard-host></app-broadbill-keyboard-host>
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

  toastMessage: string | null = null;

  toastVisible = false;



  private navSub?: Subscription;

  private httpErrSub?: Subscription;

  private facilitiesLoadSub?: Subscription;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly originalAlert = window.alert.bind(window);



  constructor(

    public auth: AuthService,

    public sidebar: SidebarStateService,

    private router: Router,

    private claimDetailsCache: ClaimDetailsBootstrapCacheService,

    private facility: FacilityService,

    private contextReset: ContextResetService,

    private facilitiesApi: FacilitiesApiService,

    private httpErrors: HttpErrorMessageService,

    private superAdminApi: SuperAdminService,
    private readonly patientNavigation: PatientNavigationService,
    private readonly claimApi: ClaimApiService

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

        this.sidebar.closeMobileDrawer();

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



  toggleNavigation(event: Event): void {

    event.stopPropagation();

    this.sidebar.toggleFromMenuButton();

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



  /** Patient Lookup = modern directory at /patients. */
  openPatientHome(): void {
    const patientId = this.activePatientIdFromRoute();
    if (patientId != null) {
      this.patientNavigation.navigateToPatientDetails(patientId);
      return;
    }

    const claimId = this.activeClaimIdFromRoute() ?? this.queryClaimIdFromRoute();
    if (claimId != null) {
      this.claimApi.getClaimById(claimId).subscribe({
        next: (claim) => {
          const resolvedPatientId = resolveClaimPatientId(claim);
          if (resolvedPatientId != null && resolvedPatientId > 0) {
            this.patientNavigation.navigateToPatientDetails(resolvedPatientId, { claimId });
          } else {
            void this.router.navigate(['/patients/new']);
          }
        },
        error: () => void this.router.navigate(['/patients/new'])
      });
      return;
    }

    void this.router.navigate(['/patients/new']);
  }

  /** Patient Lookup = modern directory at /patients. */
  openPatientLookup(): void {
    this.patientNavigation.navigateToPatientLookup();
  }

  /** Claim quick action from top bar. */
  openClaimLookup(): void {
    const claimId = this.activeClaimIdFromRoute() ?? this.queryClaimIdFromRoute();
    if (claimId != null) {
      void this.router.navigate(['/claims', claimId]);
      return;
    }

    const patientId = this.activePatientIdFromRoute();
    if (patientId != null) {
      this.claimApi.getClaims(1, 1, { patientId }).subscribe({
        next: (response) => {
          const first = response.data?.[0];
          if (first?.claID) {
            void this.router.navigate(['/claims', first.claID]);
          } else {
            void this.router.navigate(['/claims/new']);
          }
        },
        error: () => void this.router.navigate(['/claims/new'])
      });
      return;
    }

    void this.router.navigate(['/claims/new']);
  }

  private activePatientIdFromRoute(): number | null {
    const path = this.router.url.split('?')[0];
    const match = path.match(/^\/patients\/(\d+)(?:\/|$)/);
    if (!match?.[1]) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private activeClaimIdFromRoute(): number | null {
    const path = this.router.url.split('?')[0];
    const match = path.match(/^\/claims\/(\d+)(?:\/|$)/);
    if (!match?.[1]) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private queryClaimIdFromRoute(): number | null {
    const idx = this.router.url.indexOf('?');
    if (idx < 0) return null;
    const raw = new URLSearchParams(this.router.url.slice(idx)).get('claimId');
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  toggleMenu(): void {

    this.showMenu = !this.showMenu;

    if (this.showMenu) {

      this.facilityMenuOpen = false;

    }

  }



  onReviewIncoming(): void {

    void this.router.navigateByUrl('/interface-data-review');

  }
  onSidebarStateChange(state: { collapsed: boolean; mobileOpen: boolean }): void {
    this.sidebar.isCollapsed = state.collapsed;
    this.sidebar.mobileDrawerOpen = state.mobileOpen;
  }
  onFacilityChange(id: number | null): void {

    const n = id == null ? NaN : Math.floor(Number(id));

    if (id == null || !Number.isFinite(n) || n <= 0) {

      this.facility.clearFacilityStorage();

      this.selectedFacilityId = null;

      this.contextReset.resetAppState();

      return;

    }



    const current = this.selectedFacilityId ?? this.facility.getFacilityIdOptional();

    if (current != null && this.sameFacilityId(current, n)) {

      this.facilityMenuOpen = false;

      return;

    }



    if (!this.facilityOptions.some((r) => this.sameFacilityId(r.facilityId, n))) {

      return;

    }



    try {

      this.facility.setFacilityId(n);

      this.selectedFacilityId = n;

    } catch {

      this.selectedFacilityId = null;

      return;

    }

    this.contextReset.resetAppState();

  }



  getSelectedFacilityLabel(): string {

    const id = this.selectedFacilityId ?? this.facility.getFacilityIdOptional();

    if (id == null || id <= 0) {

      return 'Select facility…';

    }

    const row = this.facilityOptions.find((r) => this.sameFacilityId(r.facilityId, id));

    return row?.name.trim() || `Facility #${id}`;

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



  trackFacility(_index: number, row: OperationalFacilityRow): number {

    return Number(row.facilityId);

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

