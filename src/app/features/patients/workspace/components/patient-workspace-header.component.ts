import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { PatientWorkspaceStateService } from '../../services/patient-workspace-state.service';
import { PatientWorkspaceHeaderDto } from '../../models/patient-workspace-header.dto';

@Component({
  selector: 'app-patient-workspace-header',
  templateUrl: './patient-workspace-header.component.html',
  styleUrls: ['./patient-workspace-header.component.css', '../patient-workspace.polish.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientWorkspaceHeaderComponent {
  header$ = this.state.header$;
  financial$ = this.state.financial$;
  slice$ = this.state.slice$('header');

  constructor(
    readonly state: PatientWorkspaceStateService,
    private readonly router: Router
  ) {}

  newClaim(): void {
    const patId = this.state.context.patId;
    if (patId) {
      void this.router.navigate(['/claims/new'], { queryParams: { patientId: patId } });
    } else {
      void this.router.navigate(['/claims/new']);
    }
  }

  addPayment(): void {
    const patId = this.state.context.patId;
    if (patId) {
      void this.router.navigate(['/payments/entry'], { queryParams: { patientId: patId } });
    } else {
      void this.router.navigate(['/payments/entry']);
    }
  }

  initials(name: string | null | undefined): string {
    const parts = (name ?? '').replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  demographicLine(h: PatientWorkspaceHeaderDto): string {
    const bits: string[] = [];
    if (h.sex) bits.push(h.sex);
    if (h.dob) bits.push(h.dob + (h.ageYears != null ? ` (${h.ageYears} y)` : ''));
    if (h.mrn) bits.push(`MRN: ${h.mrn}`);
    if (h.accountNo) bits.push(`Account: ${h.accountNo}`);
    return bits.join(' · ') || '—';
  }

  formatDos(dos: string | null): string {
    if (!dos) return '—';
    const d = new Date(dos);
    return Number.isNaN(d.getTime()) ? dos : d.toLocaleDateString();
  }

  daysSinceDos(dos: string | null): number | null {
    if (!dos) return null;
    const d = new Date(dos);
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }
}
