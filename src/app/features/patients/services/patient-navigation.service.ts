import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Central patient navigation.
 * - Patient Lookup (topbar / Ctrl+P) = directory at /patients
 * - Find → Find Patients = classic list at /patients/find-patient
 * - Patient workspace (overview, claims, payments) = /patients/{id}/workspace/{tab}
 * - Classic patient details form = /patients/{id} (PatientDetailsComponent)
 */
@Injectable({ providedIn: 'root' })
export class PatientNavigationService {
  constructor(private readonly router: Router) {}

  /** Modern patient directory (Patient Lookup / topbar / Ctrl+P). */
  patientLookupRoute(): string {
    return '/patients';
  }

  navigateToPatientLookup(): void {
    void this.router.navigate([this.patientLookupRoute()]);
  }

  /** @deprecated Use navigateToPatientLookup — same modern directory. */
  findPatientsDirectoryRoute(): string {
    return this.patientLookupRoute();
  }

  /** @deprecated Use navigateToPatientLookup — same modern directory. */
  navigateToFindPatientsDirectory(): void {
    this.navigateToPatientLookup();
  }

  /** Classic Find Patients table (ribbon Find → Find Patients). */
  classicFindPatientsRoute(): string {
    return '/patients/find-patient';
  }

  navigateToClassicFindPatients(): void {
    void this.router.navigate([this.classicFindPatientsRoute()]);
  }

  navigateToNewPatient(): void {
    void this.router.navigate(['/patients/new']);
  }

  /** @deprecated Use navigateToClassicFindPatients */
  navigateToClassicFindPatient(): void {
    this.navigateToClassicFindPatients();
  }

  /** Canonical patient details screen (PatientDetailsComponent). */
  patientDetailsRoute(patId: number): (string | number)[] {
    return ['/patients', patId];
  }

  /**
   * Navigate to canonical patient details (/patients/{id}).
   * When queryParams is omitted, clears any stale query string (e.g. claimId from a prior claim).
   */
  navigateToPatientDetails(
    patId: number,
    queryParams?: Record<string, string | number | boolean | null | undefined>
  ): void {
    if (!Number.isFinite(patId) || patId <= 0) return;

    if (queryParams != null) {
      void this.router.navigate(this.patientDetailsRoute(patId), { queryParams });
      return;
    }

    void this.router.navigate(this.patientDetailsRoute(patId), { queryParamsHandling: '' });
  }

  /** Modern patient workspace (Patient Lookup Open → overview tab). */
  workspaceRoute(patId: number, tab: string = 'overview'): (string | number)[] {
    return this.patientWorkspaceRoute(patId, tab);
  }

  navigateToWorkspace(patId: number, tab: string = 'overview'): void {
    this.navigateToPatientWorkspace(patId, tab);
  }

  /** @deprecated Alias for patientDetailsRoute */
  classicDetailsRoute(patId: number): (string | number)[] {
    return this.patientDetailsRoute(patId);
  }

  /** @deprecated Use navigateToPatientDetails */
  navigateToClassic(patId: number): void {
    this.navigateToPatientDetails(patId);
  }

  /** Patient workspace with operational tabs (overview, claims, payments). */
  patientWorkspaceRoute(patId: number, tab: string = 'overview'): (string | number)[] {
    return ['/patients', patId, 'workspace', tab];
  }

  navigateToPatientWorkspace(
    patId: number,
    tab: string = 'overview',
    queryParams?: Record<string, string | number | boolean | null | undefined>
  ): void {
    if (!Number.isFinite(patId) || patId <= 0) return;

    if (queryParams != null) {
      void this.router.navigate(this.patientWorkspaceRoute(patId, tab), { queryParams });
      return;
    }

    void this.router.navigate(this.patientWorkspaceRoute(patId, tab), { queryParamsHandling: '' });
  }
}
