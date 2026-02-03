import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { Claim } from '../../core/services/claim.models';
import { AdjustmentApiService } from '../../core/services/adjustment-api.service';
import { DisbursementApiService } from '../../core/services/disbursement-api.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';

@Component({
  selector: 'app-claim-details',
  templateUrl: './claim-details.component.html',
  styleUrls: ['./claim-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimDetailsComponent implements OnInit, OnDestroy {
  claim: Claim | null = null;
  loading: boolean = false;
  error: string | null = null;
  claId: number | null = null;
  showNotes: boolean = true;
  newNote: string = '';
  claimTemplates = [
    { id: 'standard', label: 'Standard Template' },
    { id: 'ezclaim', label: 'EZClaim Desktop' },
    { id: 'custom', label: 'Custom Template' }
  ];
  diagnosisFields: Array<{ label: string; field: keyof Claim }> = [
    { label: 'Diagnosis A1', field: 'claDiagnosis1' },
    { label: 'Diagnosis B2', field: 'claDiagnosis2' },
    { label: 'Diagnosis C3', field: 'claDiagnosis3' },
    { label: 'Diagnosis D4', field: 'claDiagnosis4' },
    { label: 'Diagnosis E5', field: 'claDiagnosis5' },
    { label: 'Diagnosis F6', field: 'claDiagnosis6' },
    { label: 'Diagnosis G7', field: 'claDiagnosis7' },
    { label: 'Diagnosis H8', field: 'claDiagnosis8' },
    { label: 'Diagnosis I9', field: 'claDiagnosis9' },
    { label: 'Diagnosis J10', field: 'claDiagnosis10' },
    { label: 'Diagnosis K11', field: 'claDiagnosis11' },
    { label: 'Diagnosis L12', field: 'claDiagnosis12' }
  ];

  sectionsState = {
    claimInfo: true,
    physician: true,
    dates: true,
    misc: true,
    resubmission: true,
    paperwork: true
  };

  payments: any[] = [];
  adjustments: any[] = [];
  disbursements: any[] = [];
  loadingPayments: boolean = false;
  loadingAdjustments: boolean = false;
  loadingDisbursements: boolean = false;
  secondaryTab: 'payments' | 'adjustments' | 'disbursements' = 'payments';
  secondaryLoaded = {
    payments: false,
    adjustments: false,
    disbursements: false
  };

  serviceLines: any[] = [];
  serviceLoading: boolean = false;
  serviceLoaded: boolean = false;
  selectedServiceLineId: number | null = null;

  private claimRequestInFlight = false;
  private serviceRequestInFlight = false;
  private paymentRequestInFlight = false;
  private adjustmentRequestInFlight = false;
  private disbursementRequestInFlight = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private claimApiService: ClaimApiService,
    private serviceApi: ServiceApiService,
    private paymentApi: PaymentApiService,
    private adjustmentApi: AdjustmentApiService,
    private disbursementApi: DisbursementApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.claId = +idParam;
      this.loadClaim(this.claId);
      this.loadServiceLines();
    } else {
      this.error = 'Invalid claim ID';
    }
  }

  ngOnDestroy(): void {
    // Drain any subscriptions if necessary (currently none).
  }

  toggleSection(section: keyof typeof this.sectionsState): void {
    this.sectionsState[section] = !this.sectionsState[section];
    this.cdr.markForCheck();
  }

  loadClaim(claId: number): void {
    if (this.claimRequestInFlight) return;
    this.loading = true;
    this.error = null;
    this.claimRequestInFlight = true;

    this.claimApiService.getClaimById(claId).pipe(
      finalize(() => {
        this.loading = false;
        this.claimRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (claim: Claim) => {
        this.claim = claim;
      },
      error: (err) => {
        if (err.status === 404) {
          this.error = `Claim ${claId} not found.`;
        } else if (err.status === 503) {
          this.error = 'The server is taking too long to respond. Please try again.';
        } else if (err.status === 500) {
          this.error = 'An error occurred while loading the claim. Please try again.';
        } else {
          this.error = 'Failed to load claim details.';
        }
        console.error('Error loading claim:', err);
      }
    });
  }

  loadServiceLines(): void {
    if (!this.claId || this.serviceRequestInFlight || this.serviceLoaded) return;
    this.serviceLoading = true;
    this.serviceRequestInFlight = true;

    this.serviceApi.getServicesByClaim(this.claId).pipe(
      finalize(() => {
        this.serviceLoading = false;
        this.serviceRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (services: any[]) => {
        this.serviceLines = services || [];
        this.serviceLoaded = true;
        this.selectedServiceLineId = this.serviceLines[0]?.srvID ?? null;
      },
      error: (err) => {
        console.error('Error loading service lines:', err);
        this.serviceLines = [];
      }
    });
  }

  selectServiceLine(line: any): void {
    this.selectedServiceLineId = line.srvID;
    this.cdr.markForCheck();
  }

  trackByServiceLine(index: number, item: any): number {
    return item.srvID;
  }

  trackByPayment(index: number, item: any): number {
    return item.pmtID || index;
  }

  trackByAdjustment(index: number, item: any): number {
    return item.AdjID || index;
  }

  trackByDisbursement(index: number, item: any): number {
    return item.DisbID || index;
  }

  onSecondaryTabChange(tab: 'payments' | 'adjustments' | 'disbursements'): void {
    if (this.secondaryTab === tab) return;
    this.secondaryTab = tab;
    if (!this.claId) return;

    if (tab === 'payments' && !this.secondaryLoaded.payments && !this.loadingPayments && !this.paymentRequestInFlight) {
      this.loadPayments();
    } else if (tab === 'adjustments' && !this.secondaryLoaded.adjustments && !this.loadingAdjustments && !this.adjustmentRequestInFlight) {
      this.loadAdjustments();
    } else if (tab === 'disbursements' && !this.secondaryLoaded.disbursements && !this.loadingDisbursements && !this.disbursementRequestInFlight) {
      this.loadDisbursements();
    }
    this.cdr.markForCheck();
  }

  loadPayments(): void {
    if (!this.claId || this.paymentRequestInFlight) return;
    this.loadingPayments = true;
    this.paymentRequestInFlight = true;

    this.paymentApi.getPaymentsByClaim(this.claId).pipe(
      finalize(() => {
        this.loadingPayments = false;
        this.paymentRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (payments: any[]) => {
        this.payments = payments || [];
        this.secondaryLoaded.payments = true;
      },
      error: (err) => {
        console.error('Error loading payments:', err);
        this.payments = [];
      }
    });
  }

  loadAdjustments(): void {
    if (!this.claId || this.adjustmentRequestInFlight) return;
    this.loadingAdjustments = true;
    this.adjustmentRequestInFlight = true;

    this.adjustmentApi.getAdjustmentsByClaim(this.claId).pipe(
      finalize(() => {
        this.loadingAdjustments = false;
        this.adjustmentRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (adjustments: any[]) => {
        this.adjustments = adjustments || [];
        this.secondaryLoaded.adjustments = true;
      },
      error: (err) => {
        console.error('Error loading adjustments:', err);
        this.adjustments = [];
      }
    });
  }

  loadDisbursements(): void {
    if (!this.claId || this.disbursementRequestInFlight) return;
    this.loadingDisbursements = true;
    this.disbursementRequestInFlight = true;

    this.disbursementApi.getDisbursementsByClaim(this.claId).pipe(
      finalize(() => {
        this.loadingDisbursements = false;
        this.disbursementRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (disbursements: any[]) => {
        this.disbursements = disbursements || [];
        this.secondaryLoaded.disbursements = true;
      },
      error: (err) => {
        console.error('Error loading disbursements:', err);
        this.disbursements = [];
      }
    });
  }

  goBackToList(): void {
    this.router.navigate(['/claims/find-claim']);
  }

  addServiceLine(): void {
    console.log('Add service line clicked');
  }

  saveAndClose(): void {
    console.log('Save and close clicked');
    this.goBackToList();
  }

  save(): void {
    console.log('Save clicked');
  }

  close(): void {
    this.goBackToList();
  }

  deleteClaim(): void {
    if (confirm('Are you sure you want to delete this claim?')) {
      console.log('Delete clicked');
    }
  }

  scrub(): void {
    console.log('Scrub clicked');
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return value;
    }
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return value;
    }
  }

  getPatientName(): string {
    if (!this.claim?.patient) return 'Unknown Patient';
    const firstName = this.claim.patient.patFirstName || '';
    const lastName = this.claim.patient.patLastName || '';
    if (firstName || lastName) {
      return `${lastName.toUpperCase()}, ${firstName}`.trim();
    }
    return this.claim.patient.patFullNameCC || 'Unknown Patient';
  }

  getBillToText(): string {
    if (!this.claim) return '';
    const billTo = this.claim.claBillTo;
    if (billTo === 0) return 'Patient';
    if (billTo === 1) return 'Primary';
    if (billTo === 2) return 'Final (F/2)';
    return `Bill To ${billTo}`;
  }

  getServiceTotalCharges(): number {
    return this.serviceLines.reduce((sum, line) => sum + (line.srvCharges || 0), 0);
  }

  getServiceTotalPaid(): number {
    return this.serviceLines.reduce((sum, line) => sum + (line.srvTotalAmtPaidCC || 0), 0);
  }

  getServiceTotalBalance(): number {
    return this.serviceLines.reduce((sum, line) => sum + (line.srvTotalBalanceCC || 0), 0);
  }

  getNotesHistory(): Array<{ date: string; user: string; content: string; summary?: string }> {
    const notes: Array<{ date: string; user: string; content: string; summary?: string }> = [];

    if (this.claim?.claEDINotes) {
      notes.push({
        date: this.claim.claDateTimeModified || this.claim.claDateTimeCreated || '',
        user: 'System',
        content: this.claim.claEDINotes
      });
    }

    if (this.claim?.claRemarks) {
      notes.push({
        date: this.claim.claDateTimeModified || this.claim.claDateTimeCreated || '',
        user: 'System',
        content: this.claim.claRemarks
      });
    }

    if (this.claim?.serviceLines) {
      this.claim.serviceLines.forEach(line => {
        if (line.adjustments && line.adjustments.length > 0) {
          line.adjustments.forEach(adj => {
            notes.push({
              date: adj.adjDateTimeCreated || '',
              user: adj.payerName || 'System',
              content: `${adj.payerName || 'Payer'}: Adjustment Applied`,
              summary: `1 ${this.formatCurrency(line.srvCharges)} ${this.formatCurrency(line.srvTotalAmtPaidCC)} ${this.formatCurrency(line.srvTotalAdjCC)} ${this.formatCurrency(line.srvTotalBalanceCC)}`
            });
          });
        }
      });
    }

    return notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  toggleNotes(): void {
    this.showNotes = !this.showNotes;
    this.cdr.markForCheck();
  }

  addNote(event: Event): void {
    event.preventDefault();
    if (this.newNote.trim()) {
      console.log('Adding note:', this.newNote);
      this.newNote = '';
      this.cdr.markForCheck();
    }
  }
}
