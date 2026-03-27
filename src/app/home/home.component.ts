import { Component, OnInit } from '@angular/core';
import { ClaimApiService } from '../core/services/claim-api.service';
import { UserKpiDashboard, UserKpiPoint, UserKpiValuePoint } from '../core/services/claim.models';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  dashboard: UserKpiDashboard | null = null;
  currentUserName = '';

  constructor(
    private readonly claimApi: ClaimApiService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserName = this.authService.getUserName() ?? '';
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.claimApi.getUserKpis(30).subscribe({
      next: (res) => {
        this.dashboard = res;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load home dashboard right now.';
        this.isLoading = false;
      }
    });
  }

  hasData(): boolean {
    return !!this.dashboard && this.dashboard.totalClaims > 0;
  }

  getBarWidth(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(5, Math.round((value / max) * 100));
  }

  maxPointValue(points: UserKpiPoint[] | UserKpiValuePoint[] | undefined): number {
    if (!points || points.length === 0) return 0;
    return Math.max(...points.map((p) => p.value || 0));
  }

  pieStyle(points: UserKpiPoint[] | UserKpiValuePoint[] | undefined): string {
    if (!points || points.length === 0) {
      return 'conic-gradient(#e6ebf2 0deg 360deg)';
    }
    const colors = ['#3f7ee8', '#24a45a', '#e08a1f', '#7a4de8', '#dc5f78', '#32b6c6'];
    const total = points.reduce((sum, p) => sum + (p.value || 0), 0);
    if (total <= 0) {
      return 'conic-gradient(#e6ebf2 0deg 360deg)';
    }
    let angle = 0;
    const slices = points
      .filter((p) => p.value > 0)
      .map((p, i) => {
        const start = angle;
        angle += (p.value / total) * 360;
        return `${colors[i % colors.length]} ${start}deg ${angle}deg`;
      });
    return `conic-gradient(${slices.join(', ')})`;
  }

  trendPolyline(points: UserKpiPoint[] | undefined): string {
    if (!points || points.length === 0) return '';
    const width = 320;
    const height = 140;
    const padding = 14;
    const max = this.maxPointValue(points);
    const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
    return points
      .map((p, i) => {
        const x = padding + i * stepX;
        const yRatio = max > 0 ? p.value / max : 0;
        const y = height - padding - yRatio * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }

  formatMoney(value: number | undefined): string {
    const amount = value ?? 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount);
  }

}
