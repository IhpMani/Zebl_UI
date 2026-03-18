import { Component, OnInit } from '@angular/core';
import { EraExceptionsApiService, EraExceptionDto } from '../../core/services/era-exceptions-api.service';

@Component({
  selector: 'app-era-exceptions',
  templateUrl: './era-exceptions.component.html',
  styleUrls: ['./era-exceptions.component.scss']
})
export class EraExceptionsComponent implements OnInit {
  exceptions: EraExceptionDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(private api: EraExceptionsApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.api.getOpen().subscribe({
      next: (list) => {
        this.exceptions = list || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || err?.message || 'Failed to load ERA exceptions';
        this.loading = false;
      }
    });
  }

  resolve(row: EraExceptionDto): void {
    if (!confirm(`Mark exception #${row.id} as resolved?`)) return;
    this.api.resolve(row.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error = err?.error?.error || err?.message || 'Failed to resolve exception'
    });
  }
}

