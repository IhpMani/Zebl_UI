import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Context for ribbon Patient/Claim buttons.
 * - Claim Details sets: claimId, patientId (from claim)
 * - Patient Details sets: patientId; optionally claimId if user came from a claim
 * Ribbon uses this to navigate: Patient → /patients/{id}, Claim → /claims/{id} or Find Claim with patient filter
 */
export interface RibbonContext {
  claimId: number | null;
  patientId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class RibbonContextService {
  private readonly subject = new BehaviorSubject<RibbonContext>({ claimId: null, patientId: null });
  readonly context$ = this.subject.asObservable();

  setContext(ctx: Partial<RibbonContext>): void {
    const current = this.subject.value;
    this.subject.next({
      claimId: ctx.claimId !== undefined ? ctx.claimId : current.claimId,
      patientId: ctx.patientId !== undefined ? ctx.patientId : current.patientId
    });
  }

  getContext(): RibbonContext {
    return this.subject.value;
  }

  clearContext(): void {
    this.subject.next({ claimId: null, patientId: null });
  }
}
