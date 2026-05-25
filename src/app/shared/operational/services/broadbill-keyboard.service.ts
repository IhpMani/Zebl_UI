import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { PatientCommandCenterService } from '../../../features/patients/command-center/patient-command-center.service';
import { PatientNavigationService } from '../../../features/patients/services/patient-navigation.service';
import { WorkspaceSlideoverService } from './workspace-slideover.service';
import { PatientWorkspaceTabId } from '../../../features/patients/models/patient-workspace-tab-id';

export interface KeyboardShortcutEvent {
  id: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class BroadbillKeyboardService {
  readonly shortcut$ = new Subject<KeyboardShortcutEvent>();

  constructor(
    private readonly router: Router,
    private readonly commandCenter: PatientCommandCenterService,
    private readonly slideover: WorkspaceSlideoverService,
    private readonly patientNav: PatientNavigationService
  ) {}

  handleKeydown(event: KeyboardEvent): void {
    if (this.isTypingInField(event)) return;

    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;

    if (key === 'escape') {
      if (this.commandCenter.isOpen) {
        event.preventDefault();
        this.commandCenter.close();
        return;
      }
      if (this.slideover.isOpen) {
        event.preventDefault();
        this.slideover.close();
        return;
      }
      return;
    }

    if (!mod) return;

    if (key === 'k') {
      event.preventDefault();
      this.commandCenter.open('global-search');
      this.shortcut$.next({ id: 'global-search', label: 'Global search' });
      return;
    }

    if (key === 'p') {
      event.preventDefault();
      this.patientNav.navigateToPatientLookup();
      this.shortcut$.next({ id: 'patient-lookup', label: 'Patient lookup' });
      return;
    }

    if (event.shiftKey && key === 'c') {
      event.preventDefault();
      const patId = this.currentPatientId();
      if (patId) {
        void this.router.navigate(['/claims/new'], { queryParams: { patientId: patId } });
      } else {
        void this.router.navigate(['/claims/new']);
      }
      this.shortcut$.next({ id: 'new-claim', label: 'New claim' });
      return;
    }

    if (!event.shiftKey && !event.altKey) {
      const tab = this.ctrlDigitTab(key);
      if (tab) {
        const patId = this.currentPatientId();
        if (patId) {
          event.preventDefault();
          void this.router.navigate(['/patients', patId, 'workspace', tab]);
          this.shortcut$.next({ id: `tab-${tab}`, label: `${tab} tab` });
        }
      }
    }
  }

  private ctrlDigitTab(key: string): PatientWorkspaceTabId | null {
    if (key === '1') return 'overview';
    if (key === '2') return 'claims';
    if (key === '3') return 'payments';
    return null;
  }

  private currentPatientId(): number | null {
    const m = this.router.url.match(/\/patients\/(\d+)\/workspace/);
    if (!m) return null;
    const id = Number(m[1]);
    return Number.isFinite(id) ? id : null;
  }

  private isTypingInField(event: KeyboardEvent): boolean {
    const el = event.target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }
}
