import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Hl7ImportService, Hl7ReviewResponse, Hl7ImportHistoryRow } from '../../core/services/hl7-import.service';

@Component({
  selector: 'app-interface-data-review',
  templateUrl: './interface-data-review.component.html',
  styleUrls: ['./interface-data-review.component.css']
})
export class InterfaceDataReviewComponent implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  pendingFileName: string | null = null;
  currentFile: File | null = null;

  // Pre-import review summary
  review: Hl7ReviewResponse | null = null;
  reviewing = false;
  reviewError: string | null = null;

  // History (DB-driven)
  history: Hl7ImportHistoryRow[] = [];
  loadingHistory = false;
  historyError: string | null = null;

  importing = false; // during actual import
  importError: string | null = null;
  /** Shown after import completes (even when pending row clears) so failures stay visible. */
  lastImportDetail: string | null = null;
  lastImportHadFailures = false;

  constructor(private hl7Service: Hl7ImportService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory = true;
    this.historyError = null;
    this.hl7Service.getImportHistory().subscribe({
      next: (rows: Hl7ImportHistoryRow[]) => {
        console.log('Import history loaded:', rows);
        this.history = rows || [];
        this.loadingHistory = false;
        if (this.history.length === 0) {
          console.warn('Import history is empty. Table may not exist or has no records.');
        }
      },
      error: (err: any) => {
        console.error('Error loading import history:', err);
        this.loadingHistory = false;
        this.historyError = err?.error?.error ?? err?.message ?? 'Failed to load import history.';
      }
    });
  }

  onImportClick(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }

    this.pendingFileName = file.name;
    this.currentFile = file;
    this.importError = null;
    this.reviewError = null;
    this.review = null;

    // Call existing backend HL7 review/analyze logic (no commit yet).
    this.reviewing = true;
    this.hl7Service.reviewHl7File(file).subscribe({
      next: (res: Hl7ReviewResponse) => {
        this.reviewing = false;
        this.review = res;
      },
      error: (err: any) => {
        this.reviewing = false;
        this.reviewError = err?.error?.error ?? 'Failed to analyze HL7 file.';
      }
    });

    // Reset file input so the same filename can be selected again if needed.
    input.value = '';
  }

  onConfirmImport(): void {
    if (!this.currentFile) return;

    this.importError = null;
    this.importing = true;

    this.hl7Service.importHl7File(this.currentFile).subscribe({
      next: (res) => {
        this.importing = false;
        this.importError = null;
        if (res.failedMessages > 0) {
          this.lastImportHadFailures = true;
          const fromApi = res.errorMessages?.filter((m) => !!m?.trim()) ?? [];
          this.lastImportDetail =
            fromApi.length > 0
              ? fromApi.join(' ')
              : `${res.failedMessages} of ${res.totalMessages} HL7 message(s) failed. Check API logs for exceptions.`;
        } else {
          this.lastImportHadFailures = false;
          this.lastImportDetail =
            res.totalMessages > 0
              ? `Imported ${res.successfulMessages} of ${res.totalMessages} message(s) successfully.`
              : null;
        }
        this.pendingFileName = null;
        this.currentFile = null;
        this.review = null;
        this.loadHistory(); // Refresh history from DB
      },
      error: (err: any) => {
        this.importing = false;
        this.importError = err?.error?.error ?? 'Failed to import HL7 file.';
      }
    });
  }

  onCancelReview(): void {
    this.pendingFileName = null;
    this.currentFile = null;
    this.review = null;
    this.reviewError = null;
    this.importError = null;
    this.lastImportDetail = null;
    this.lastImportHadFailures = false;
  }
}

