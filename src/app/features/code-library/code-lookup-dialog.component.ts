import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CodeLibraryApiService, CodeLibraryItem } from '../../core/services/code-library-api.service';
import { LookupType } from '../../core/services/code-library-api.service';

@Component({
  selector: 'app-code-lookup-dialog',
  templateUrl: './code-lookup-dialog.component.html',
  styleUrls: ['./code-lookup-dialog.component.scss']
})
export class CodeLookupDialogComponent {
  @Input() lookupType!: LookupType;
  @Input() title?: string;
  @Output() select = new EventEmitter<CodeLibraryItem>();
  @Output() close = new EventEmitter<void>();

  keyword = '';
  results: CodeLibraryItem[] = [];
  loading = false;
  selectedIndex = -1;

  constructor(private api: CodeLibraryApiService) {}

  get dialogTitle(): string {
    if (this.title) return this.title;
    const labels: Record<LookupType, string> = {
      diagnosis: 'Diagnosis Code Lookup',
      modifier: 'Modifier Lookup',
      pos: 'Place of Service Lookup',
      procedure: 'Procedure Code Lookup'
    };
    return labels[this.lookupType] || 'Code Lookup';
  }

  search(): void {
    const q = this.keyword.trim();
    if (!q) {
      this.results = [];
      return;
    }
    this.loading = true;
    this.api.lookup(this.lookupType, q).subscribe({
      next: list => {
        this.results = list;
        this.selectedIndex = list.length ? 0 : -1;
        this.loading = false;
      },
      error: () => {
        this.results = [];
        this.loading = false;
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    } else if (event.key === 'Enter' && this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
      event.preventDefault();
      this.choose(this.results[this.selectedIndex]);
    } else if (event.key === 'Escape') {
      this.close.emit();
    }
  }

  choose(item: CodeLibraryItem): void {
    this.select.emit(item);
    this.close.emit();
  }

  closeDialog(): void {
    this.close.emit();
  }
}
