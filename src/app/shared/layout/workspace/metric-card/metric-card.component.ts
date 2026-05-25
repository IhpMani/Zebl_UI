import { Component, Input } from '@angular/core';

export type MetricCardTone = 'default' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-metric-card',
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.css', '../styles/workspace-primitives.css']
})
export class MetricCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() tone: MetricCardTone = 'default';
}
