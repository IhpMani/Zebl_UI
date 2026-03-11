import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CodeLibraryTab } from './code-library-page.component';

@Component({
  selector: 'app-code-library-tabs',
  templateUrl: './code-library-tabs.component.html',
  styleUrls: ['./code-library-tabs.component.scss']
})
export class CodeLibraryTabsComponent {
  @Input() activeTab!: CodeLibraryTab;
  @Input() tabs!: { id: CodeLibraryTab; label: string }[];
  @Output() tabChange = new EventEmitter<CodeLibraryTab>();

  select(tab: CodeLibraryTab): void {
    this.tabChange.emit(tab);
  }
}
