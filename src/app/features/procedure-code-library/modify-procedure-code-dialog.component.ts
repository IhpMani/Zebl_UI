import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export interface ModifyProcedureCodeDialogPayload {
  applyCharge: boolean;
  charge: number | null;

  applyAllowed: boolean;
  allowed: number | null;

  applyAdjust: boolean;
  adjust: number | null;

  applyPayer: boolean;
  payerId: number | null;

  applyRateClass: boolean;
  rateClass: string | null;

  applyBillingProvider: boolean;
  billingPhysicianId: number | null;

  applyCategory: boolean;
  category: string | null;

  applySubcategory: boolean;
  subcategory: string | null;

  applyStart: boolean;
  startDate: string | null;

  applyEnd: boolean;
  endDate: string | null;
}

@Component({
  selector: 'app-modify-procedure-code-dialog',
  templateUrl: './modify-procedure-code-dialog.component.html',
  styleUrls: ['./modify-procedure-code-dialog.component.scss']
})
export class ModifyProcedureCodeDialogComponent implements OnChanges {
  @Input() payerOptions: { value: number; label: string }[] = [];
  @Input() physicianOptions: { value: number; label: string }[] = [];
  @Input() rateClassOptions: string[] = [];
  @Input() prefill: Partial<ModifyProcedureCodeDialogPayload> | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() applyToChecked = new EventEmitter<ModifyProcedureCodeDialogPayload>();
  @Output() createNewFromChecked = new EventEmitter<ModifyProcedureCodeDialogPayload>();
  @Output() openRateClassSelector = new EventEmitter<void>();

  model: ModifyProcedureCodeDialogPayload = {
    applyCharge: false,
    charge: null,
    applyAllowed: false,
    allowed: null,
    applyAdjust: false,
    adjust: null,
    applyPayer: false,
    payerId: null,
    applyRateClass: false,
    rateClass: null,
    applyBillingProvider: false,
    billingPhysicianId: null,
    applyCategory: false,
    category: null,
    applySubcategory: false,
    subcategory: null,
    applyStart: false,
    startDate: null,
    applyEnd: false,
    endDate: null
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prefill'] && this.prefill) {
      this.model = { ...this.model, ...this.prefill };
    }
  }

  apply(): void {
    this.applyToChecked.emit({ ...this.model });
  }

  createNew(): void {
    this.createNewFromChecked.emit({ ...this.model });
  }
}

