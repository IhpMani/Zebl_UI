import { Component, HostListener, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { take, Subscription } from 'rxjs';
import { RibbonContextService } from '../core/services/ribbon-context.service';
import { ClaimApiService } from '../core/services/claim-api.service';
import { EdiReportCountService } from '../core/services/edi-report-count.service';
import { SidebarStateService } from '../core/services/sidebar-state.service';
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
  panelLeft = 220;
  panelTop = 0;
  panelTitle = '';
  private countSub?: Subscription;
  private readonly findItems: SidebarPanelItem[] = [
    { label: 'Find Claims', value: 'Find Claim' },
    { label: 'Find Patients', value: 'Find Patient' },
    { label: 'Find Services', value: 'Find Service' },
    { label: 'Find Payments', value: 'Find Payment' },
    { label: 'Find Adjustments', value: 'Find Adjustment' },
    { label: 'Find Payers', value: 'Find Payer' },
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
    private sidebarState: SidebarStateService
  ) { }

  ngOnInit(): void {
    this.ediReportCountService.refresh();
    this.countSub = this.ediReportCountService.getCount().subscribe(n => this.ediReportCount = n);
    this.sidebarCollapsed = this.sidebarState.isCollapsed;
    this.emitSidebarState();
  }

  ngOnDestroy(): void {
    this.countSub?.unsubscribe();
  }

  /** Navigate to the patient for the current claim (Claim Details) or open Find Patient */
  onPatientClick(): void {
    const ctx = this.ribbonContext.getContext();
    const isOnClaimDetails = this.router.url.startsWith('/claims/');
    if (isOnClaimDetails && ctx.patientId) {
      const qp = ctx.claimId ? { claimId: ctx.claimId } : {};
      this.router.navigate(['patients', ctx.patientId], { queryParams: qp });
    } else {
      this.router.navigate(['patients/new']);
    }
    this.closeMobileSidebar();
  }

  /** Open Payment Entry screen (manual payment posting). */
  onPaymentClick(): void {
    this.router.navigate(['payments/entry']);
    this.closeMobileSidebar();
  }

  /** Navigate to the claim for the current patient (Patient Details) or open Find Claim */
  onClaimClick(): void {
    const ctx = this.ribbonContext.getContext();
    const isOnPatientDetails = this.router.url.startsWith('/patients/');
    if (isOnPatientDetails && ctx.claimId) {
      this.router.navigate(['claims', ctx.claimId]);
    } else if (isOnPatientDetails && ctx.patientId) {
      this.claimApiService.getClaims(1, 1, { patientId: ctx.patientId })
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            const first = response.data?.[0];
            if (first?.claID) {
              this.router.navigate(['claims', first.claID]);
            } else {
              this.router.navigate(['claims/new'], { queryParams: { patientId: ctx.patientId } });
            }
          },
          error: () => {
            this.router.navigate(['claims/new'], { queryParams: { patientId: ctx.patientId } });
          }
        });
    } else {
      this.router.navigate(['claims/new']);
    }
    this.closeMobileSidebar();
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
      case 'Find Patient':
        this.router.navigate(['patients/find-patient']);
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
    this.panelLeft = this.sidebarCollapsed ? 72 : 220;
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

    const rect = target.getBoundingClientRect();
    const top = Math.max(8, rect.top);
    const left = this.sidebarCollapsed ? 72 : 220;

    if (this.sidebarState.activeMenu === menu) {
      this.closeFloatingPanel();
      return;
    }

    this.panelTop = top;
    this.panelLeft = left;
    this.panelTitle = menu === 'find' ? 'Find' : 'Libraries';
    this.sidebarState.setActiveMenu(menu, top);
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
