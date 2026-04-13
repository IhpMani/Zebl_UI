import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

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
export class RateClassSelectorDialogComponent implements OnChanges {
  @Input() payerOptions: { value: number; label: string }[] = [];
  @Input() physicianOptions: { value: number; label: string }[] = [];
  @Input() rateClassOptions: string[] = [];
  /** Filled when user picks a file from the parent (Import flow). */
  @Input() importFileLabel: string | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() ok = new EventEmitter<RateClassSelectorResult>();
  @Output() browseProcedureFile = new EventEmitter<void>();

  model: RateClassSelectorResult = {
    procedureCodeFile: null,
    rateClass: null,
    billingPhysicianId: null,
    payerId: null
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['importFileLabel']) {
      const v = this.importFileLabel?.trim();
      this.model = {
        ...this.model,
        procedureCodeFile: v && v.length > 0 ? v : this.model.procedureCodeFile
      };
    }
  }

  submit(): void {
    this.ok.emit({ ...this.model });
  }
}

