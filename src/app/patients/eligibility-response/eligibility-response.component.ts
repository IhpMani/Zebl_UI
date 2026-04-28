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

    const str = String(value);
    if (/^\d{8}$/.test(str)) {
      const yyyy = str.slice(0, 4);
      const mm = str.slice(4, 6);
      const dd = str.slice(6, 8);
      return `${mm}/${dd}/${yyyy}`;
    }

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

