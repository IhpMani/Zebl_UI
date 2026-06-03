import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import {
  AddColumnPickerModel,
  buildAddColumnPickerModel
} from './claim-add-column-dialog.utils';
import { AdditionalColumnDefinition } from '../claim-list/claim-list-additional-columns';

@Component({
  selector: 'app-claim-add-column-dialog',
  templateUrl: './claim-add-column-dialog.component.html',
  styleUrls: ['./claim-add-column-dialog.component.css']
})
export class ClaimAddColumnDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() columnSearchText = '';
  /** Keys of columns currently visible in the grid (checkbox checked state). */
  @Input() selectedColumnKeys: string[] = [];

  @Output() columnSearchTextChange = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @Output() columnToggled = new EventEmitter<string>();
  @Output() clearAllRequested = new EventEmitter<void>();

  /** Snapshot built when the dialog opens or search text changes — avoids stale method results in the template. */
  pickerModel: AddColumnPickerModel = buildAddColumnPickerModel('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['columnSearchText']) {
      this.refreshPickerModel();
    }
  }

  private refreshPickerModel(): void {
    this.pickerModel = buildAddColumnPickerModel(this.columnSearchText);
  }

  columnsForCategory(category: string): AdditionalColumnDefinition[] {
    return this.pickerModel.columnsByCategory.get(category) ?? [];
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
