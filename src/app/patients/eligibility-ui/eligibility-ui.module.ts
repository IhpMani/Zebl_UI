import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EligibilityResponseComponent } from '../eligibility-response/eligibility-response.component';

@NgModule({
  declarations: [EligibilityResponseComponent],
  imports: [CommonModule],
  exports: [EligibilityResponseComponent]
})
export class EligibilityUiModule {}
