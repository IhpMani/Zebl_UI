import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PayerApiService } from '../../core/services/payer-api.service';
import { PayerListItem } from '../../core/services/payer.models';

@Component({
  selector: 'app-payer-library-embed',
  templateUrl: './payer-library-embed.component.html',
  styleUrls: ['./payer-library-embed.component.scss']
})
export class PayerLibraryEmbedComponent implements OnInit {
  /** When true, clicking a payer in the list assigns it and closes (physician picker parity). */
  @Input() pickerMode = false;
  @Input() initialPayId: number | null = null;
  @Output() payerSelected = new EventEmitter<{ payID: number }>();
  @Output() payerSaved = new EventEmitter<{ payID: number; payName: string | null }>();
  @Output() closed = new EventEmitter<void>();

  payers: PayerListItem[] = [];
  selectedId: number | null = null;
  showNew = false;
  showInactive = false;
  loading = false;
  error: string | null = null;

  constructor(
    private payerApi: PayerApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.initialPayId ?? 0);
    if (id > 0) {
      this.selectedId = id;
    }
    this.loadPayers();
  }

  loadPayers(): void {
    this.loading = true;
    this.error = null;
    this.payerApi.getPayers(1, 500, { inactive: this.showInactive }).subscribe({
      next: (res) => {
        this.payers = res.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const status = err?.status;
        if (status === 0) {
          this.error = 'Cannot reach the API. Start the Zebl API (e.g. on http://localhost:5226).';
        } else {
          this.error = err?.error?.message || err?.message || 'Failed to load payers';
        }
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onShowInactiveChange(): void {
    this.loadPayers();
  }

  selectPayer(id: number): void {
    if (this.pickerMode) {
      this.payerSelected.emit({ payID: id });
      return;
    }
    this.selectedId = id;
    this.showNew = false;
    this.cdr.markForCheck();
  }

  onAddNew(): void {
    if (this.pickerMode) {
      return;
    }
    this.selectedId = null;
    this.showNew = true;
    this.cdr.markForCheck();
  }

  isSelected(id: number): boolean {
    return this.selectedId === id && !this.showNew;
  }

  displayName(p: PayerListItem): string {
    const name = p.payName?.trim() || '(No name)';
    return p.payInactive ? `${name} (Inactive)` : name;
  }

  onFormClosed(): void {
    this.closed.emit();
  }

  onFormPayerSaved(payer: { payID: number; payName: string | null }): void {
    this.payerSaved.emit(payer);
    this.loadPayers();
    if (payer.payID && !this.showNew) {
      this.selectedId = payer.payID;
    }
  }

  onFormDeleted(): void {
    this.selectedId = null;
    this.showNew = false;
    this.loadPayers();
  }
}
