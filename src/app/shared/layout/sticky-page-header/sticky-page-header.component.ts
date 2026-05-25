import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sticky-page-header',
  templateUrl: './sticky-page-header.component.html',
  styleUrls: ['./sticky-page-header.component.css']
})
export class StickyPageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
