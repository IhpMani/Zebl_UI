import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface RateClassSelectorResult {
  procedureCodeFile: string | null;
  rateClass: string | null;
  billingPhysicianId: number | null;
  payerId: number | null;
}

@Component({
  selector: 'app-rate-class-selector-dialog',
  templateUrl: './rate-class-selector-dialog.component.html',
  styleUrls: ['./rate-class-selector-dialog.component.scss']
})
export class RateClassSelectorDialogComponent {
  @Input() payerOptions: { value: number; label: string }[] = [];
  @Input() physicianOptions: { value: number; label: string }[] = [];
  @Input() rateClassOptions: string[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() ok = new EventEmitter<RateClassSelectorResult>();
  @Output() browseProcedureFile = new EventEmitter<void>();

  model: RateClassSelectorResult = {
    procedureCodeFile: null,
    rateClass: null,
    billingPhysicianId: null,
    payerId: null
  };

  submit(): void {
    this.ok.emit({ ...this.model });
  }
}

