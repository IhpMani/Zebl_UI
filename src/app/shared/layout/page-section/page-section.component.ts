import { Component, Input } from '@angular/core';
import { SectionHeaderIconKey } from '../../ui/section-header/section-header.component';

@Component({
  selector: 'app-page-section',
  templateUrl: './page-section.component.html',
  styleUrls: ['./page-section.component.css']
})
export class PageSectionComponent {
  @Input() title = '';
  @Input() iconKey: SectionHeaderIconKey = '';
  @Input() divided = true;
}
