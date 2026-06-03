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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['response']) {
      const prevId = changes['response'].previousValue?.inquiryId;
      const nextId = changes['response'].currentValue?.inquiryId;
      if (prevId !== nextId) {
        this.diagnosticsExpanded = false;
      }
      this.view = buildEligibilityResponseViewModel(this.response, v => this.formatDate(v));
      queueMicrotask(() => this.syncDialogOpenState());
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.response) this.close();
  }

  toggleDiagnostics(): void {
    this.diagnosticsExpanded = !this.diagnosticsExpanded;
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
