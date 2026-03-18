import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimRejectionsApiService, ClaimRejectionDto } from '../../core/services/claim-rejections-api.service';

@Component({
  selector: 'app-claim-rejections',
  templateUrl: './claim-rejections.component.html',
  styleUrls: ['./claim-rejections.component.scss']
})
export class ClaimRejectionsComponent implements OnInit {
  rows: ClaimRejectionDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private api: ClaimRejectionsApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.api.getAll().subscribe({
      next: list => {
        this.rows = list || [];
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || err?.message || 'Failed to load claim rejections.';
        this.loading = false;
      }
    });
  }

  openClaim(row: ClaimRejectionDto): void {
    if (!row.claimId) return;
    this.router.navigate(['/claims', row.claimId]);
  }

  resolve(row: ClaimRejectionDto): void {
    if (!confirm(`Mark rejection #${row.id} as resolved?`)) {
      return;
    }
    this.api.resolve(row.id).subscribe({
      next: () => this.load(),
      error: err => {
        this.error = err?.error?.error || err?.message || 'Failed to resolve rejection.';
      }
    });
  }
}

