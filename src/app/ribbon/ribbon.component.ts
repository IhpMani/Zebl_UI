import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.css']
})
export class RibbonComponent {
  showFindDropdown: boolean = false;

  constructor(private router: Router) { }

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
        console.log('Navigating to Find Patient');
        // this.router.navigate(['patients/find-patient']);
        break;
      case 'Find Service':
        console.log('Navigating to Find Service');
        // this.router.navigate(['services/find-service']);
        break;
      case 'Find Payment':
        console.log('Navigating to Find Payment');
        // this.router.navigate(['payments/find-payment']);
        break;
      case 'Find Task':
        console.log('Navigating to Find Task');
        // this.router.navigate(['tasks/find-task']);
        break;
      case 'Find Adjustment':
        console.log('Navigating to Find Adjustment');
        // this.router.navigate(['adjustments/find-adjustment']);
        break;
      case 'Find Payer':
        console.log('Navigating to Find Payer');
        // this.router.navigate(['payers/find-payer']);
        break;
      case 'Find Physician':
        console.log('Navigating to Find Physician');
        // this.router.navigate(['physicians/find-physician']);
        break;
      case 'Find Disbursement':
        console.log('Navigating to Find Disbursement');
        // this.router.navigate(['disbursements/find-disbursement']);
        break;
      case 'Find Claim Note':
        console.log('Navigating to Find Claim Note');
        // this.router.navigate(['claim-notes/find-claim-note']);
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
}
