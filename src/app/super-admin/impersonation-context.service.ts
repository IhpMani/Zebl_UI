import { Injectable } from '@angular/core';

const PRACTICE_NAME_KEY = 'zebl.impersonation.practiceName';

@Injectable({ providedIn: 'root' })
export class ImpersonationContextService {
  setPracticeName(name: string): void {
    try {
      sessionStorage.setItem(PRACTICE_NAME_KEY, name.trim());
    } catch {
      /* ignore */
    }
  }

  getPracticeName(): string | null {
    try {
      const raw = sessionStorage.getItem(PRACTICE_NAME_KEY);
      return raw?.trim() ? raw : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(PRACTICE_NAME_KEY);
    } catch {
      /* ignore */
    }
  }
}
