import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from './page-shell/page-shell.component';
import { PageSectionComponent } from './page-section/page-section.component';
import { PageToolbarComponent } from './page-toolbar/page-toolbar.component';
import { StickyPageHeaderComponent } from './sticky-page-header/sticky-page-header.component';
import { PageDividerComponent } from './page-divider/page-divider.component';
import { SharedUiModule } from '../ui/shared-ui.module';

@NgModule({
  declarations: [
    PageShellComponent,
    PageSectionComponent,
    PageToolbarComponent,
    StickyPageHeaderComponent,
    PageDividerComponent
  ],
  imports: [CommonModule, SharedUiModule],
  exports: [
    PageShellComponent,
    PageSectionComponent,
    PageToolbarComponent,
    StickyPageHeaderComponent,
    PageDividerComponent
  ]
})
export class LayoutModule {}
