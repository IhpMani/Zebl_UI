import { Component, Input } from '@angular/core';

export type PageShellVariant = 'default' | 'dense' | 'split' | 'detail' | 'workspace';

@Component({
  selector: 'app-page-shell',
  templateUrl: './page-shell.component.html',
  styleUrls: ['./page-shell.component.css']
})
export class PageShellComponent {
  /** default: standard padding | dense: list/grid | split: master-detail | detail: narrow form | workspace: full-width ops */
  @Input() variant: PageShellVariant = 'default';

  get hostClass(): string {
    return `page-shell page-shell--${this.variant}`;
  }
}
