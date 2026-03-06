import { Component } from '@angular/core';
import { IHeaderParams } from 'ag-grid-community';

export interface AddColumnHeaderParams extends IHeaderParams {
  openColumnChooser?: () => void;
}

@Component({
  selector: 'app-add-column-header',
  template: `
    <div class="add-column-header" (click)="onClick()">
      <span>Add Column</span>
    </div>
  `,
  styles: [`
    .add-column-header {
      cursor: pointer;
      padding: 2px 6px;
      font-weight: 600;
      user-select: none;
    }
    .add-column-header:hover {
      text-decoration: underline;
    }
  `]
})
export class AddColumnHeaderComponent {
  private params!: AddColumnHeaderParams;

  agInit(params: AddColumnHeaderParams): void {
    this.params = params;
  }

  onClick(): void {
    this.params.openColumnChooser?.();
  }
}
