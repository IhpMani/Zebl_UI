import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Surfaces API error messages (e.g. 400) for a simple shell banner — optional for UX.
 */
@Injectable({ providedIn: 'root' })
export class HttpErrorMessageService {
  private readonly messageSubject = new BehaviorSubject<string | null>(null);
  readonly message$ = this.messageSubject.asObservable();

  show(message: string): void {
    this.messageSubject.next(message);
    window.setTimeout(() => this.clear(), 8000);
  }

  clear(): void {
    this.messageSubject.next(null);
  }
}
