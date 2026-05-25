import { Injectable } from '@angular/core';
import { PatientWorkspaceHeaderDto } from '../models/patient-workspace-header.dto';
import { PatientFinancialSummaryDto } from '../models/patient-financial-summary.dto';
import { PatientRecentClaimDto } from '../models/patient-recent-claim.dto';
import { PatientContextualAction } from '../models/operational-context.model';
import { deriveClaimStatusCategory } from '../utils/claim-status.util';

/** Contextual actions — only routes to implemented workspace tabs or payment entry. */
@Injectable({ providedIn: 'root' })
export class PatientContextualActionsService {
  buildActions(
    header: PatientWorkspaceHeaderDto | null,
    financial: PatientFinancialSummaryDto | null,
    recentClaims: PatientRecentClaimDto[]
  ): PatientContextualAction[] {
    if (!header) return [];

    const actions: PatientContextualAction[] = [];
    const patId = header.patId;
    const hasRts = recentClaims.some((c) => deriveClaimStatusCategory(c.status) === 'rts');
    const balance = Number(header.totalBalance ?? financial?.totalBalance ?? 0);

    if (hasRts) {
      actions.push({
        id: 'rts-review',
        label: 'RTS claims',
        tone: 'warning',
        route: `/patients/${patId}/workspace/claims`
      });
    }

    if (balance > 0) {
      actions.push({
        id: 'collections',
        label: 'Outstanding balance',
        tone: 'danger',
        route: `/patients/${patId}/workspace/overview`
      });
    }

    actions.push({
      id: 'payment-entry',
      label: 'Post payment',
      tone: 'primary',
      route: '/payments/entry',
      queryParams: { patientId: patId }
    });

    if (!header.primaryPayer) {
      actions.push({
        id: 'insurance-warning',
        label: 'Insurance missing',
        tone: 'warning',
        route: `/patients/${patId}/workspace/overview`
      });
    }

    return actions;
  }
}
