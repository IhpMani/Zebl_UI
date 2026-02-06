import { Component, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Hl7ImportService } from '../core/services/hl7-import.service';

@Component({
  selector: 'app-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.css']
})
export class RibbonComponent {
  showFindDropdown: boolean = false;
  isImporting: boolean = false;
  importMessage: string = '';
  importError: string = '';

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private router: Router,
    private hl7ImportService: Hl7ImportService
  ) { }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  toggleFindDropdown(event: Event): void {
    event.stopPropagation();
    this.showFindDropdown = !this.showFindDropdown;
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
    const dropdownElement = document.querySelector('.dropdown-wrapper');
    
    if (dropdownElement && !dropdownElement.contains(target)) {
      this.showFindDropdown = false;
    }
  }

  /**
   * Handles Review Incoming button click
   * Opens file picker for .hl7 files
   */
  onReviewIncomingClick(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Handles file selection and triggers HL7 import
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.hl7')) {
      this.importError = 'Please select a .hl7 file';
      this.importMessage = '';
      // Reset file input
      input.value = '';
      return;
    }

    // Import the file
    this.importHl7File(file);

    // Reset file input for next selection
    input.value = '';
  }

  /**
   * Imports the selected HL7 file
   */
  private importHl7File(file: File): void {
    this.isImporting = true;
    this.importError = '';
    this.importMessage = '';

    this.hl7ImportService.importHl7File(file).subscribe({
      next: (response) => {
        this.isImporting = false;
        // Display import result
        if (response.success) {
          this.importMessage = `Imported ${response.fileName}: ${response.successfulMessages}/${response.totalMessages} messages processed successfully`;
          if (response.failedMessages > 0) {
            this.importMessage += ` (${response.failedMessages} failed)`;
          }
        } else {
          this.importError = 'Import completed with errors';
        }
        this.importError = '';
        
        // Show message for 10 seconds, then clear
        setTimeout(() => {
          this.importMessage = '';
        }, 10000);
      },
      error: (error) => {
        this.isImporting = false;
        // Extract error message from response
        const errorMessage = error.error?.error || error.error?.message || error.message || 'Failed to import HL7 file. Please try again.';
        this.importError = errorMessage;
        this.importMessage = '';
        
        // Show error for 10 seconds, then clear
        setTimeout(() => {
          this.importError = '';
        }, 10000);
      }
    });
  }
}
