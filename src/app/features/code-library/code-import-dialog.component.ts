import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CodeLibraryApiService, LibraryKey } from '../../core/services/code-library-api.service';

@Component({
  selector: 'app-code-import-dialog',
  templateUrl: './code-import-dialog.component.html',
  styleUrls: ['./code-import-dialog.component.scss']
})
export class CodeImportDialogComponent {
  @Input() libraryKey!: LibraryKey;
  @Output() close = new EventEmitter<void>();

  file: File | null = null;
  importing = false;
  result: { importedCount: number; skippedCount: number } | null = null;
  error: string | null = null;

  constructor(private api: CodeLibraryApiService) {}

  get importType(): string | null {
    return this.api.getImportTypeForLibrary(this.libraryKey);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.result = null;
    this.error = null;
  }

  import(): void {
    const type = this.importType;
    if (!type) {
      this.error = 'Import not available for this library.';
      return;
    }
    if (!this.file) {
      this.error = 'Select a CSV file (Code[TAB]Description).';
      return;
    }
    this.importing = true;
    this.error = null;
    this.result = null;
    this.api.import(type, this.file).subscribe({
      next: res => {
        this.result = res;
        this.importing = false;
      },
      error: err => {
        this.error = err?.message || 'Import failed';
        this.importing = false;
      }
    });
  }

  closeDialog(): void {
    this.close.emit();
  }
}
