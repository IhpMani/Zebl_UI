import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { EligibilityApiService } from '../../core/services/eligibility-api.service';
import { EligibilityResponsePayload, EligibilityResponseViewModel } from './eligibility-response.models';
import { buildEligibilityResponseViewModel } from './eligibility-response.mapper';

@Component({
  selector: 'app-eligibility-response',
  templateUrl: './eligibility-response.component.html',
  styleUrls: ['./eligibility-response.component.css']
})
export class EligibilityResponseComponent implements OnChanges {
  @Input() response: EligibilityResponsePayload | null = null;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('dialogEl') dialogEl?: ElementRef<HTMLDialogElement>;

  view: EligibilityResponseViewModel | null = null;
  diagnosticsExpanded = false;
  loadingRawPayloads = false;

  private raw271Override: string | null = null;
  private raw270Override: string | null = null;

  constructor(private readonly eligibilityApi: EligibilityApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['response']) {
      const prevId = changes['response'].previousValue?.inquiryId;
      const nextId = changes['response'].currentValue?.inquiryId;
      if (prevId !== nextId) {
        this.diagnosticsExpanded = false;
        this.raw271Override = null;
        this.raw270Override = null;
        this.loadingRawPayloads = false;
      }
      this.refreshView();
      queueMicrotask(() => this.syncDialogOpenState());
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.response) this.close();
  }

  toggleDiagnostics(): void {
    const expanding = !this.diagnosticsExpanded;
    this.diagnosticsExpanded = expanding;
    if (expanding) {
      this.loadDiagnosticsPayloads();
    }
  }

  private loadDiagnosticsPayloads(): void {
    const id = this.response?.inquiryId;
    if (!id || this.loadingRawPayloads) {
      return;
    }

    const has271 = !!(this.response?.raw271 || this.raw271Override);
    const has270 = !!(this.response?.raw270 || this.raw270Override);
    if (has271 && has270) {
      this.refreshView();
      return;
    }

    this.loadingRawPayloads = true;
    this.refreshView();
    this.eligibilityApi.getById(id, true, true).subscribe({
      next: status => {
        this.raw271Override = status.raw271 ?? null;
        this.raw270Override = status.raw270 ?? null;
        this.loadingRawPayloads = false;
        this.refreshView();
      },
      error: () => {
        this.loadingRawPayloads = false;
        this.refreshView();
      }
    });
  }

  private loadRaw271Preview(): void {
    this.loadDiagnosticsPayloads();
  }

  private refreshView(): void {
    const payload =
      this.response && (this.raw271Override || this.raw270Override)
        ? {
            ...this.response,
            raw271: this.raw271Override ?? this.response.raw271,
            raw270: this.raw270Override ?? this.response.raw270
          }
        : this.response;
    this.view = buildEligibilityResponseViewModel(payload, v => this.formatDate(v));
  }

  formatDate(value: unknown): string {
    if (!value) return '';

    const str = String(value);
    const isoDate = str.includes('T') ? str.split('T')[0] : null;
    if (isoDate && isoDate !== str) return this.formatDate(isoDate);

    if (/^\d{8}$/.test(str)) {
      const yyyy = str.slice(0, 4);
      const mm = str.slice(4, 6);
      const dd = str.slice(6, 8);
      return `${mm}/${dd}/${yyyy}`;
    }

    const parts = str.split('-');
    if (parts.length !== 3) return str;

    const [yyyy, mm, dd] = parts;
    if (!yyyy || !mm || !dd) return str;

    return `${mm}/${dd}/${yyyy}`;
  }

  close(): void {
    const dialog = this.dialogEl?.nativeElement;
    if (dialog?.open) dialog.close();
    this.response = null;
    this.view = null;
    this.closed.emit();
  }

  private syncDialogOpenState(): void {
    const dialog = this.dialogEl?.nativeElement;
    if (!dialog) return;

    if (this.response && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!this.response && dialog.open) {
      dialog.close();
    }
  }
}
