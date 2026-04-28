import { Component, Input } from '@angular/core';

/** Built-in SVG icons (Font Awesome is not bundled — use this instead of `icon`). */
export type SectionHeaderIconKey =
  | 'clinical'
  | 'calendar'
  | 'timeline'
  | 'financial'
  | 'provider'
  | 'template'
  | '';

@Component({
  selector: 'app-section-header',
  templateUrl: './section-header.component.html',
  styleUrls: ['./section-header.component.css']
})
export class SectionHeaderComponent {
  @Input() title: string = '';
  /** @deprecated Font Awesome classes render only if FA CSS is loaded; prefer `iconKey`. */
  @Input() icon: string = '';
  @Input() iconKey: SectionHeaderIconKey = '';
}
