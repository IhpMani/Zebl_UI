import { Component, HostListener, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

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
    private router: Router
  ) { }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToPhysicianLibrary(): void {
    this.router.navigate(['/physicians']);
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
