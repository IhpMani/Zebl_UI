import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { OperationalUxModule } from '../../shared/operational/operational-ux.module';
import { PatientLookupPanelComponent } from './command-center/patient-lookup-panel.component';

@NgModule({
  declarations: [PatientLookupPanelComponent],
  imports: [CommonModule, ReactiveFormsModule, OperationalUxModule],
  exports: [PatientLookupPanelComponent]
})
export class PatientsCommandCenterModule {}
