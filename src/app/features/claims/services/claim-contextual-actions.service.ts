import { Injectable } from '@angular/core';
import { ClaimWorkspaceHeaderDto } from '../models/claim-workspace-header.dto';

export interface ClaimWorkflowAction {
  id: string;
  label: string;
  tone: 'default' | 'warning' | 'danger' | 'primary';
  route?: string | null;
  queryParams?: Record<string, string | number>;
  disabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClaimContextualActionsService {
  buildActions(header: ClaimWorkspaceHeaderDto | null): ClaimWorkflowAction[] {
    if (!header) return [];
    const actions: ClaimWorkflowAction[] = [];
    const id = header.claimId;

    if (header.statusCategory === 'rts') {
      actions.push({ id: 'resubmit', label: 'Resubmit claim', tone: 'warning', route: '/claims/send' });
      actions.push({ id: 'rejections', label: 'View rejection', tone: 'danger', route: '/claims/rejections' });
    }
    if (header.statusCategory === 'denied') {
      actions.push({ id: 'appeal', label: 'Appeal / correct', tone: 'warning', route: `/claims/${id}` });
    }
    if (Number(header.patientBalance ?? 0) > 0) {
      actions.push({
        id: 'payment',
        label: 'Post payment',
        tone: 'primary',
        route: '/payments/entry',
        queryParams: header.patientId != null ? { claimId: id, patientId: header.patientId } : { claimId: id }
      });
    }
    actions.push({ id: 'edi', label: 'ERA / EDI review', tone: 'default', route: '/edi-reports' });
    actions.push({ id: 'legacy', label: 'Classic claim editor', tone: 'default', route: `/claims/${id}` });
    return actions;
  }
}
