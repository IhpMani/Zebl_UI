import { Component, HostListener, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { take, Subscription } from 'rxjs';
import { RibbonContextService } from '../core/services/ribbon-context.service';
import { PatientNavigationService } from '../features/patients/services/patient-navigation.service';
import { PatientWorkspaceStateService } from '../features/patients/services/patient-workspace-state.service';
import { ClaimApiService } from '../core/services/claim-api.service';
import { resolveClaimPatientId } from '../core/utils/claim-patient-id.util';
import { EdiReportCountService } from '../core/services/edi-report-count.service';
import { SidebarStateService } from '../core/services/sidebar-state.service';
import { AuthService } from '../core/services/auth.service';
import { SidebarPanelItem } from './sidebar-floating-panel.component';

@Component({
  selector: 'app-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.css']
})
export class RibbonComponent implements OnInit, OnDestroy {
  showFindDropdown: boolean = false;
  showLibrariesDropdown: boolean = false;
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  ediReportCount = 0;
  panelLeft = 76;
  panelTop = 0;
  panelTitle = '';
  private countSub?: Subscription;
  private readonly findItems: SidebarPanelItem[] = [
    { label: 'Find Claims', value: 'Find Claim' },
    { label: 'Find Patients', value: 'Find Patients' },
    { label: 'Find Services', value: 'Find Service' },
    { label: 'Find Payments', value: 'Find Payment' },
    { label: 'Find Disbursements', value: 'Find Disbursement' },
    { label: 'Find Adjustments', value: 'Find Adjustment' },
    { label: 'Find Payers', value: 'Find Payer' },
    { label: 'Find Physicians', value: 'Find Physician' },
    { label: 'Find Claim Notes', value: 'Find Claim Note' },
  ];
  private readonly libraryItems: SidebarPanelItem[] = [
    { label: 'Add-On Services', value: 'Add-On Services' },
    { label: 'Authorization', value: 'Authorization' },
    { label: 'City State Zip', value: 'City State Zip' },
    { label: 'Claim Template', value: 'Claim Template' },
    { label: 'Code Library', value: 'Code Library' },
    { label: 'EDI Connection', value: 'EDI Connection' },
    { label: 'List', value: 'List' },
    { label: 'Payer', value: 'Payer' },
    { label: 'Physician Facility', value: 'Physician Facility' },
    { label: 'Procedure Code', value: 'Procedure Code' },
    { label: 'Submitter / Receiver', value: 'Submitter / Receiver' },
  ];

  // Raised when the user wants to review incoming HL7 files.
  @Output() reviewIncoming = new EventEmitter<void>();
  @Output() sidebarStateChange = new EventEmitter<{ collapsed: boolean; mobileOpen: boolean }>();

  constructor(
    private router: Router,
    private ribbonContext: RibbonContextService,
    private claimApiService: ClaimApiService,
    private ediReportCountService: EdiReportCountService,
    private sidebarState: SidebarStateService,
    private readonly patientNav: PatientNavigationService,
    private readonly patientWorkspaceState: PatientWorkspaceStateService,
    private readonly auth: AuthService
  ) { }

  /** Practice admin user management — normal nav item, no "Administration" section label. */
  get showAdministration(): boolean {
    return this.auth.canAccessUserManagement();
  }

  ngOnInit(): void {
    this.ediReportCountService.refresh();
    this.countSub = this.ediReportCountService.getCount().subscribe(n => this.ediReportCount = n);
    this.sidebarCollapsed = this.sidebarState.isCollapsed;
    this.emitSidebarState();
  }

  ngOnDestroy(): void {
    this.countSub?.unsubscribe();
  }

  /** Context-aware: from claim editor → related patient; else patient directory. */
  onPatientClick(): void {
    const ctx = this.ribbonContext.getContext();
    const claimId = this.activeClaimIdFromRoute();

    if (claimId != null) {
      const openPatient = (patientId: number) => {
        this.ribbonContext.setContext({ claimId, patientId });
        this.patientNav.navigateToPatientDetails(patientId, { claimId });
      };

      if (ctx.patientId) {
        openPatient(ctx.patientId);
        this.closeMobileSidebar();
        return;
      }

      this.claimApiService
        .getClaimById(claimId)
        .pipe(take(1))
        .subscribe({
          next: (claim) => {
            const patientId = resolveClaimPatientId(claim);
            if (patientId) {
              openPatient(patientId);
            } else {
              this.patientNav.navigateToPatientLookup();
            }
          },
          error: () => this.patientNav.navigateToPatientLookup()
        });
      this.closeMobileSidebar();
      return;
    }

    const patientId = this.activePatientIdFromRoute();
    if (patientId != null) {
      this.ribbonContext.setContext({ patientId, claimId: ctx.claimId });
      this.patientNav.navigateToPatientDetails(patientId);
      this.closeMobileSidebar();
      return;
    }

    this.patientNav.navigateToPatientLookup();
    this.closeMobileSidebar();
  }

  /** Open Payment Entry screen (manual payment posting). */
  onPaymentClick(): void {
    this.router.navigate(['payments/entry']);
    this.closeMobileSidebar();
  }

  /** Context-aware: from patient editor → related claim; else claim directory. */
  onClaimClick(): void {
    const ctx = this.ribbonContext.getContext();
    const patientId = this.activePatientIdFromRoute() ?? ctx.patientId;

    if (patientId != null) {
      const claimId = this.resolveClaimIdForPatient(patientId, ctx);
      if (claimId != null) {
        this.ribbonContext.setContext({ patientId, claimId });
        void this.router.navigate(['/claims', claimId]);
        this.closeMobileSidebar();
        return;
      }

      this.claimApiService
        .getClaims(1, 1, { patientId })
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            const first = response.data?.[0];
            if (first?.claID) {
              this.ribbonContext.setContext({ patientId, claimId: first.claID });
              void this.router.navigate(['/claims', first.claID]);
            } else {
              void this.router.navigate(['/claims/find-claim']);
            }
          },
          error: () => void this.router.navigate(['/claims/find-claim'])
        });
      this.closeMobileSidebar();
      return;
    }

    const claimId = this.activeClaimIdFromRoute();
    if (claimId != null) {
      void this.router.navigate(['/claims', claimId]);
      this.closeMobileSidebar();
      return;
    }

    void this.router.navigate(['/claims/find-claim']);
    this.closeMobileSidebar();
  }

  /** Numeric claim id from /claims/{id} or /claims/{id}/workspace (not find-claim, new, send). */
  private activeClaimIdFromRoute(): number | null {
    const match = this.currentUrlPath().match(/^\/claims\/(\d+)(?:\/|$)/);
    if (!match?.[1]) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  /** Numeric patient id from /patients/{id}/… (not list, new, find-patient). */
  private activePatientIdFromRoute(): number | null {
    const match = this.currentUrlPath().match(/^\/patients\/(\d+)(?:\/|$)/);
    if (!match?.[1]) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private currentUrlPath(): string {
    return this.router.url.split('?')[0];
  }

  private queryClaimIdFromRoute(): number | null {
    const idx = this.router.url.indexOf('?');
    if (idx < 0) return null;
    const raw = new URLSearchParams(this.router.url.slice(idx)).get('claimId');
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private resolveClaimIdForPatient(
    patientId: number,
    ctx: { claimId: number | null; patientId: number | null }
  ): number | null {
    const fromQuery = this.queryClaimIdFromRoute();
    if (fromQuery != null) return fromQuery;
    if (ctx.claimId != null) return ctx.claimId;

    const ws = this.patientWorkspaceState.context;
    if (ws.patId === patientId && ws.selectedClaimId != null) {
      return ws.selectedClaimId;
    }
    return null;
  }

  /** Open Send Claims batch screen. */
  goToSendClaims(): void {
    this.router.navigate(['claims/send']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  goToHome(): void {
    this.router.navigate(['/']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  goToPhysicianLibrary(): void {
    this.router.navigate(['/physicians']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  goToProgramSetup(): void {
    this.router.navigate(['/tools/program-setup']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  goToUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  goToFacilities(): void {
    this.router.navigate(['/admin/facilities']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  goToApiAccess(): void {
    this.router.navigate(['/admin/api-access']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  /** EDI Library = Submitter/Receiver library (configure receivers). */
  goToReceiverLibrary(): void {
    this.router.navigate(['/receiver-library']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  /** EDI Reports = run/generate EDI reports (different from library). */
  goToEdiReports(): void {
    this.router.navigate(['/edi-reports']);
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  toggleFindDropdown(event: Event): void {
    event.stopPropagation();
    this.openFloatingPanel('find', event);
  }

  toggleLibrariesDropdown(event: Event): void {
    event.stopPropagation();
    this.openFloatingPanel('libraries', event);
  }

  findOptionSelected(option: string): void {
    this.closeFloatingPanel();
    switch (option) {
      case 'Find Claim':
        this.router.navigate(['claims/find-claim']);
        break;
      case 'Find Patients':
        this.patientNav.navigateToClassicFindPatients();
        break;
      case 'Find Patient':
        this.patientNav.navigateToClassicFindPatients();
        break;
      case 'Find Service':
        this.router.navigate(['services/find-service']);
        break;
      case 'Find Payment':
        this.router.navigate(['payments/find-payment']);
        break;
      case 'Find Task':
        console.log('Find Task - Not implemented yet');
        break;
      case 'Find Adjustment':
        this.router.navigate(['adjustments/find-adjustment']);
        break;
      case 'Find Payer':
        this.router.navigate(['payers/find-payer']);
        break;
      case 'Find Physician':
        this.router.navigate(['physicians/find-physician']);
        break;
      case 'Find Disbursement':
        this.router.navigate(['disbursements/find-disbursement']);
        break;
      case 'Find Claim Note':
        this.router.navigate(['claim-notes/find-claim-note']);
        break;
      default:
        console.log(`Navigating to ${option}`);
        break;
    }
    this.closeMobileSidebar();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInsideDropdown = !!target.closest('.dropdown-wrapper');
    const clickedInsideFloating = !!target.closest('.floating-panel');

    if (!clickedInsideDropdown && !clickedInsideFloating) {
      this.closeFloatingPanel();
    }
  }

  libraryOptionSelected(option: string): void {
    this.closeFloatingPanel();
    
    switch (option) {
      case 'Physician Facility':
        this.router.navigate(['/physicians']);
        break;
      case 'List':
        this.router.navigate(['/lists/list-library']);
        break;
      case 'Submitter / Receiver':
        this.router.navigate(['/receiver-library']);
        break;
      case 'EDI Connection':
        this.router.navigate(['/connection-library']);
        break;
      case 'Payer':
        this.router.navigate(['/payer-library/new']);
        break;
      case 'Procedure Code':
        this.router.navigate(['/libraries/procedure-codes']);
        break;
      case 'Code Library':
        this.router.navigate(['/code-library']);
        break;
      case 'Claim Template':
        this.router.navigate(['/claim-template-library']);
        break;
      case 'City State Zip':
        this.router.navigate(['/libraries/city-state-zip']);
        break;
      default:
        console.log(`Library option selected: ${option}`);
        // Placeholder for future routing/functionality
        break;
    }
    this.closeMobileSidebar();
  }

  /**
   * Handles Review Incoming button click
   * Opens the Interface Data Review page (no file picker here).
   */
  onReviewIncomingClick(): void {
    this.reviewIncoming.emit();
    this.closeFloatingPanel();
    this.closeMobileSidebar();
  }

  toggleSidebarCollapse(event: Event): void {
    event.stopPropagation();
    this.sidebarState.toggleCollapsed();
    this.sidebarCollapsed = this.sidebarState.isCollapsed;
    this.panelLeft = this.sidebarCollapsed ? 52 : 76;
    this.emitSidebarState();
  }

  toggleMobileSidebar(event: Event): void {
    event.stopPropagation();
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
    this.emitSidebarState();
  }

  closeMobileSidebar(): void {
    if (this.mobileSidebarOpen) {
      this.mobileSidebarOpen = false;
      this.emitSidebarState();
    }
  }

  get activeMenu(): string | null {
    return this.sidebarState.activeMenu;
  }

  get panelItems(): SidebarPanelItem[] {
    if (this.activeMenu === 'find') return this.findItems;
    if (this.activeMenu === 'libraries') return this.libraryItems;
    return [];
  }

  onFloatingItemSelect(option: string): void {
    if (this.activeMenu === 'find') {
      this.findOptionSelected(option);
      return;
    }
    if (this.activeMenu === 'libraries') {
      this.libraryOptionSelected(option);
    }
  }

  private openFloatingPanel(menu: string, event: Event): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    if (this.sidebarState.activeMenu === menu) {
      this.closeFloatingPanel();
      return;
    }

    const rect = target.getBoundingClientRect();
    const items = menu === 'find' ? this.findItems : this.libraryItems;
    const left = this.sidebarCollapsed ? 52 : 76;
    const top = this.computePanelTop(rect.top, items.length);

    this.panelTop = top;
    this.panelLeft = left;
    this.panelTitle = menu === 'find' ? 'Find' : 'Libraries';
    this.sidebarState.setActiveMenu(menu, top);
  }

  /**
   * Place the panel so its bottom never exceeds the viewport.
   * Estimates panel height from item count (matches CSS: ~36px per item + ~28px title + ~16px padding).
   * The CSS also enforces `max-height: calc(100vh - 16px)` and `overflow-y: auto` as a safety net.
   */
  private computePanelTop(triggerTop: number, itemCount: number): number {
    if (typeof window === 'undefined') return Math.max(8, triggerTop);
    const estimatedHeight = 28 + 16 + Math.max(1, itemCount) * 36;
    const maxTop = window.innerHeight - estimatedHeight - 8;
    return Math.max(8, Math.min(triggerTop, maxTop));
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.activeMenu) return;
    const items = this.panelItems;
    this.panelTop = this.computePanelTop(this.panelTop, items.length);
  }

  private closeFloatingPanel(): void {
    this.sidebarState.setActiveMenu(null, 0);
  }

  isRouteActive(route: string): boolean {
    if (route === '/') {
      return this.router.url === '/';
    }
    return this.router.url.startsWith(route);
  }

  private emitSidebarState(): void {
    this.sidebarStateChange.emit({
      collapsed: this.sidebarCollapsed,
      mobileOpen: this.mobileSidebarOpen
    });
  }
}
