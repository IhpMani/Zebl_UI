import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface WorkspaceSlideoverConfig {
  title: string;
  subtitle?: string | null;
  /** Arbitrary context for the hosting panel (claim id, payment id, etc.). */
  context?: Record<string, unknown>;
  width?: 'sm' | 'md' | 'lg';
}

@Injectable({ providedIn: 'root' })
export class WorkspaceSlideoverService {
  private readonly openSubject = new BehaviorSubject<WorkspaceSlideoverConfig | null>(null);
  readonly config$ = this.openSubject.asObservable();

  get isOpen(): boolean {
    return this.openSubject.value != null;
  }

  open(config: WorkspaceSlideoverConfig): void {
    this.openSubject.next({ width: 'md', ...config });
  }

  close(): void {
    this.openSubject.next(null);
  }
}
