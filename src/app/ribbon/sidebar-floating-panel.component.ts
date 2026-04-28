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

  onSelect(value: string): void {
    this.itemSelect.emit(value);
  }
}
