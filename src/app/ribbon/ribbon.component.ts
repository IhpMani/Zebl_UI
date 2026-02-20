import { Component, HostListener, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { RibbonContextService } from '../core/services/ribbon-context.service';
import { ClaimApiService } from '../core/services/claim-api.service';

@Component({
  selector: 'app-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.css']
})
export class RibbonComponent {
  showFindDropdown: boolean = false;
  showLibrariesDropdown: boolean = false;

  // Raised when the user wants to review incoming HL7 files.
  @Output() reviewIncoming = new EventEmitter<void>();

  constructor(
    private router: Router,
    private ribbonContext: RibbonContextService,
    private claimApiService: ClaimApiService
  ) { }

  /** Navigate to the patient for the current claim (Claim Details) or open Find Patient */
  onPatientClick(): void {
    const ctx = this.ribbonContext.getContext();
    if (ctx.patientId) {
      const qp = ctx.claimId ? { claimId: ctx.claimId } : {};
      this.router.navigate(['patients', ctx.patientId], { queryParams: qp });
    } else {
      this.router.navigate(['patients/find-patient']);
    }
  }

  /** Navigate to the claim for the current patient (Patient Details) or open Find Claim */
  onClaimClick(): void {
    const ctx = this.ribbonContext.getContext();
    if (ctx.claimId) {
      this.router.navigate(['claims', ctx.claimId]);
    } else if (ctx.patientId) {
      this.claimApiService.getClaims(1, 1, { patientId: ctx.patientId })
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            const first = response.data?.[0];
            if (first?.claID) {
              this.router.navigate(['claims', first.claID]);
            } else {
              this.router.navigate(['claims/find-claim'], { queryParams: { patientId: ctx.patientId } });
            }
          },
          error: () => {
            this.router.navigate(['claims/find-claim'], { queryParams: { patientId: ctx.patientId } });
          }
        });
    } else {
      this.router.navigate(['claims/find-claim']);
    }
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToPhysicianLibrary(): void {
    this.router.navigate(['/physicians']);
  }

  /** EDI Library = Submitter/Receiver library (configure receivers). */
  goToReceiverLibrary(): void {
    this.router.navigate(['/receiver-library']);
  }

  /** EDI Reports = run/generate EDI reports (different from library). */
  goToEdiReports(): void {
    this.router.navigate(['/edi-reports']);
  }

  toggleFindDropdown(event: Event): void {
    event.stopPropagation();
    this.showFindDropdown = !this.showFindDropdown;
    // Close Libraries dropdown when opening Find
    if (this.showFindDropdown) {
      this.showLibrariesDropdown = false;
    }
  }

  toggleLibrariesDropdown(event: Event): void {
    event.stopPropagation();
    this.showLibrariesDropdown = !this.showLibrariesDropdown;
    // Close Find dropdown when opening Libraries
    if (this.showLibrariesDropdown) {
      this.showFindDropdown = false;
    }
  }

  findOptionSelected(option: string): void {
    this.showFindDropdown = false;
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
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdownElements = document.querySelectorAll('.dropdown-wrapper');
    
    let clickedInside = false;
    dropdownElements.forEach(element => {
      if (element.contains(target)) {
        clickedInside = true;
      }
    });
    
    if (!clickedInside) {
      this.showFindDropdown = false;
      this.showLibrariesDropdown = false;
    }
  }

  libraryOptionSelected(option: string): void {
    this.showLibrariesDropdown = false;
    
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
      default:
        console.log(`Library option selected: ${option}`);
        // Placeholder for future routing/functionality
        break;
    }
  }

  /**
   * Handles Review Incoming button click
   * Opens the Interface Data Review page (no file picker here).
   */
  onReviewIncomingClick(): void {
    this.reviewIncoming.emit();
  }
}
