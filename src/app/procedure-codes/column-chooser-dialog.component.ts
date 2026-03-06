import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ColumnChooserItem {
  colId: string;
  headerName: string;
}

@Component({
  selector: 'app-column-chooser-dialog',
  templateUrl: './column-chooser-dialog.component.html',
  styleUrls: ['./column-chooser-dialog.component.scss']
})
export class ColumnChooserDialogComponent {
  @Input() hiddenColumns: ColumnChooserItem[] = [];
  @Output() showColumn = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() ok = new EventEmitter<void>();
}
