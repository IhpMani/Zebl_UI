import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-eligibility-response',
  templateUrl: './eligibility-response.component.html',
  styleUrls: ['./eligibility-response.component.css']
})
export class EligibilityResponseComponent {
  @Input() response: any = null;
  @Output() closed = new EventEmitter<void>();

  formatDate(value: unknown): string {
    if (!value)
      return '';

    // `DateOnly` from .NET serializes as `yyyy-MM-dd`. We format without timezone conversion.
    const str = String(value);
    const parts = str.split('-');
    if (parts.length !== 3)
      return str;

    const [yyyy, mm, dd] = parts;
    if (!yyyy || !mm || !dd)
      return str;

    return `${mm}/${dd}/${yyyy}`;
  }

  close(): void {
    // Hide this modal immediately; also notify the parent so the input state can clear.
    this.response = null;
    this.closed.emit();
  }
}

