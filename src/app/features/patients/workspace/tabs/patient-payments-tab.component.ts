import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PatientPaymentRowDto } from '../../models/patient-payment-row.dto';
import { PatientWorkspaceStateService } from '../../services/patient-workspace-state.service';
import { WorkspaceSlideoverService } from '../../../../shared/operational/services/workspace-slideover.service';

@Component({
  selector: 'app-patient-payments-tab',
  templateUrl: './patient-payments-tab.component.html',
  styleUrls: ['./patient-tab.shared.css', '../patient-workspace.polish.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientPaymentsTabComponent implements OnInit {
  slice$ = this.state.slice$('payments');
  rows$ = this.state.paymentsTabRows$;
  financial$ = this.state.financial$;

  constructor(
    readonly state: PatientWorkspaceStateService,
    private readonly slideover: WorkspaceSlideoverService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.state.setActiveTab('payments');
  }

  openPayment(row: PatientPaymentRowDto): void {
    this.state.selectPayment(row.paymentId);
    this.slideover.open({
      title: `Payment ${row.paymentId}`,
      subtitle: row.paymentType,
      context: {
        paymentId: row.paymentId,
        paymentDate: row.paymentDate,
        amount: row.amount,
        unappliedAmount: row.unappliedAmount
      }
    });
  }

  openPaymentEntry(): void {
    const patId = this.state.context.patId;
    if (patId) {
      void this.router.navigate(['/payments/entry'], { queryParams: { patientId: patId } });
    }
  }

  retry(): void {
    this.state.reloadPaymentsTab();
  }

  hasUnapplied(row: PatientPaymentRowDto): boolean {
    return Number(row.unappliedAmount ?? 0) > 0;
  }

  trackRow(_: number, r: PatientPaymentRowDto): number {
    return r.paymentId;
  }
}
