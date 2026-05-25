import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from './card/card.component';
import { SectionHeaderComponent } from './section-header/section-header.component';
import { SummaryCardComponent } from './summary-card/summary-card.component';

@NgModule({
  declarations: [CardComponent, SectionHeaderComponent, SummaryCardComponent],
  imports: [CommonModule],
  exports: [CardComponent, SectionHeaderComponent, SummaryCardComponent]
})
export class SharedUiModule {}
