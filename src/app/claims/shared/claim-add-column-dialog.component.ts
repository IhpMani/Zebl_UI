import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  getAdditionalColumnCategories,
  getAdditionalColumnsByCategory
} from './claim-add-column-dialog.utils';

@Component({
  selector: 'app-claim-add-column-dialog',
  templateUrl: './claim-add-column-dialog.component.html',
  styleUrls: ['./claim-add-column-dialog.component.css']
})
export class ClaimAddColumnDialogComponent {
  @Input() open = false;
  @Input() columnSearchText = '';
  /** Keys of columns currently shown in the grid (for checkbox state). */
  @Input() selectedColumnKeys: string[] = [];

  @Output() columnSearchTextChange = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @Output() columnToggled = new EventEmitter<string>();
  @Output() clearAllRequested = new EventEmitter<void>();

  getAdditionalColumnCategories(): string[] {
    return getAdditionalColumnCategories(this.columnSearchText);
  }

  getAdditionalColumnsByCategory(category: string) {
    return getAdditionalColumnsByCategory(category, this.columnSearchText);
  }

  isColumnSelected(key: string): boolean {
    return this.selectedColumnKeys.includes(key);
  }

  onSearchInput(value: string): void {
    this.columnSearchTextChange.emit(value);
  }

  close(event?: MouseEvent): void {
    if (event && !(event.target as HTMLElement).classList.contains('customization-overlay')) {
      return;
    }
    this.closed.emit();
  }

  onToggle(key: string): void {
    this.columnToggled.emit(key);
  }

  onClearAll(): void {
    this.clearAllRequested.emit();
  }
}
