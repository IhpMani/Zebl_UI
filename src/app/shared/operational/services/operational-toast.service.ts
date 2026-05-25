import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type OperationalToastTone = 'info' | 'success' | 'warning' | 'error';

export interface OperationalToastMessage {
  text: string;
  tone: OperationalToastTone;
  at: number;
}

@Injectable({ providedIn: 'root' })
export class OperationalToastService {
  private readonly subject = new BehaviorSubject<OperationalToastMessage | null>(null);
  readonly message$ = this.subject.asObservable();

  show(text: string, tone: OperationalToastTone = 'info', durationMs = 3200): void {
    this.subject.next({ text, tone, at: Date.now() });
    if (durationMs > 0) {
      setTimeout(() => {
        const cur = this.subject.value;
        if (cur?.text === text) this.subject.next(null);
      }, durationMs);
    }
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  info(text: string): void {
    this.show(text, 'info');
  }

  warning(text: string): void {
    this.show(text, 'warning');
  }

  error(text: string): void {
    this.show(text, 'error', 4500);
  }

  dismiss(): void {
    this.subject.next(null);
  }
}
