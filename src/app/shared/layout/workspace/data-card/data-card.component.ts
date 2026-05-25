import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-data-card',
  templateUrl: './data-card.component.html',
  styleUrls: ['./data-card.component.css', '../styles/workspace-primitives.css']
})
export class DataCardComponent {
  @Input() title = '';
}
