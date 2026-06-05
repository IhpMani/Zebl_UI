import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Notifies the app shell to reload the top-bar facility switcher after admin changes. */
@Injectable({ providedIn: 'root' })
export class OperationalFacilitiesRefreshService {
  private readonly changed = new Subject<void>();

  readonly facilitiesChanged$ = this.changed.asObservable();

  notifyFacilitiesChanged(): void {
    this.changed.next();
  }
}
