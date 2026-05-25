import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CommandCenterMode = 'patient-lookup' | 'global-search';

@Injectable({ providedIn: 'root' })
export class PatientCommandCenterService {
  private readonly openSubject = new BehaviorSubject<{
    open: boolean;
    mode: CommandCenterMode;
  }>({ open: false, mode: 'patient-lookup' });

  readonly state$ = this.openSubject.asObservable();

  get isOpen(): boolean {
    return this.openSubject.value.open;
  }

  open(mode: CommandCenterMode = 'patient-lookup'): void {
    this.openSubject.next({ open: true, mode });
  }

  close(): void {
    this.openSubject.next({ open: false, mode: this.openSubject.value.mode });
  }

  toggle(mode: CommandCenterMode = 'patient-lookup'): void {
    if (this.isOpen) this.close();
    else this.open(mode);
  }
}
