import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SidebarPanelItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-sidebar-floating-panel',
  templateUrl: './sidebar-floating-panel.component.html',
  styleUrls: ['./sidebar-floating-panel.component.css']
})
export class SidebarFloatingPanelComponent {
  @Input() visible = false;
  @Input() left = 220;
  @Input() top = 0;
  @Input() items: SidebarPanelItem[] = [];
  @Input() title = '';
  @Output() itemSelect = new EventEmitter<string>();

  /** Available vertical space below `top`, leaving an 8px gutter. CSS also caps it. */
  get maxHeight(): number {
    if (typeof window === 'undefined') return 600;
    return Math.max(160, window.innerHeight - this.top - 8);
  }

  onSelect(value: string): void {
    this.itemSelect.emit(value);
  }
}
