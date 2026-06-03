import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Notifies workspace overview to refetch eligibility after a check completes elsewhere. */
@Injectable({ providedIn: 'root' })
export class PatientEligibilityRefreshService {
  private readonly changedSubject = new Subject<number>();
  readonly changed$ = this.changedSubject.asObservable();

  notify(patientId: number): void {
    if (patientId > 0) {
      this.changedSubject.next(patientId);
    }
  }
}
