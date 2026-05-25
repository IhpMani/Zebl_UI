import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { PatientNavigationService } from '../services/patient-navigation.service';

/** Deep link `/patients/lookup` → modern patient directory. */
@Component({
  selector: 'app-patient-lookup-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientLookupPageComponent implements OnInit {
  constructor(private readonly patientNav: PatientNavigationService) {}

  ngOnInit(): void {
    this.patientNav.navigateToPatientLookup();
  }
}
