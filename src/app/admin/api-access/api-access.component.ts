import { Component, OnInit } from '@angular/core';
import {
  ApiTokensApiService,
  ApiTokenListItemDto,
  CreateApiTokenResponse,
} from '../../core/services/api-tokens-api.service';
import {
  AdminFacilityListItem,
  FacilitiesAdminApiService,
} from '../../core/services/facilities-admin-api.service';
import { OperationalToastService } from '../../shared/operational/services/operational-toast.service';
import { friendlyApiErrorMessage } from '../../core/utils/api-error-message.util';

@Component({
  selector: 'app-api-access',
  templateUrl: './api-access.component.html',
  styleUrls: ['./api-access.component.css'],
})
export class ApiAccessComponent implements OnInit {
  tokens: ApiTokenListItemDto[] = [];
  facilities: AdminFacilityListItem[] = [];
  loading = false;
  facilitiesLoading = false;

  showGenerateModal = false;
  showSuccessModal = false;

  tokenName = '';
  expiryDays = 30;
  facilityId: number | null = null;

  createdToken: CreateApiTokenResponse | null = null;
  generating = false;
  revokingId: string | null = null;

  readonly expiryOptions = [
    { days: 7, label: '7 days' },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
  ];

  constructor(
    private apiTokens: ApiTokensApiService,
    private facilitiesApi: FacilitiesAdminApiService,
    private toast: OperationalToastService
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.loadFacilities();
  }

  refresh(): void {
    this.loading = true;
    this.apiTokens.list().subscribe({
      next: (rows) => {
        this.tokens = Array.isArray(rows) ? rows : [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(friendlyApiErrorMessage(err, 'Could not load API tokens.'));
      },
    });
  }

  loadFacilities(): void {
    this.facilitiesLoading = true;
    this.facilitiesApi.list().subscribe({
      next: (rows) => {
        this.facilities = (Array.isArray(rows) ? rows : []).filter((f) => f.isActive);
        this.facilitiesLoading = false;
      },
      error: () => {
        this.facilitiesLoading = false;
      },
    });
  }

  openGenerate(): void {
    this.tokenName = '';
    this.expiryDays = 30;
    this.facilityId = this.facilities.length === 1 ? this.facilities[0].facilityId : null;
    this.showGenerateModal = true;
  }

  closeGenerate(): void {
    this.showGenerateModal = false;
  }

  submitGenerate(): void {
    const name = this.tokenName.trim();
    if (!name) {
      this.toast.error('Token name is required.');
      return;
    }
    if (this.facilityId == null || this.facilityId <= 0) {
      this.toast.error('Facility is required.');
      return;
    }

    this.generating = true;
    this.apiTokens
      .create({
        name,
        expiryDays: this.expiryDays,
        facilityId: this.facilityId,
      })
      .subscribe({
        next: (res) => {
          this.generating = false;
          this.showGenerateModal = false;
          this.createdToken = res;
          this.showSuccessModal = true;
          this.refresh();
        },
        error: (err) => {
          this.generating = false;
          this.toast.error(friendlyApiErrorMessage(err, 'Could not generate token.'));
        },
      });
  }

  closeSuccess(): void {
    this.showSuccessModal = false;
    this.createdToken = null;
  }

  async copyCreatedToken(): Promise<void> {
    const value = this.createdToken?.token;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.toast.success('Token copied.');
    } catch {
      this.toast.error('Could not copy to clipboard.');
    }
  }

  async copyPrefix(row: ApiTokenListItemDto): Promise<void> {
    try {
      await navigator.clipboard.writeText(row.tokenPreview);
      this.toast.success('Prefix copied.');
    } catch {
      this.toast.error('Could not copy to clipboard.');
    }
  }

  revoke(row: ApiTokenListItemDto): void {
    if (!row.isActive || this.revokingId) return;
    if (!confirm(`Revoke API token "${row.name}"? This cannot be undone.`)) return;

    this.revokingId = row.id;
    this.apiTokens.revoke(row.id).subscribe({
      next: () => {
        this.revokingId = null;
        this.toast.success('Token revoked.');
        this.refresh();
      },
      error: (err) => {
        this.revokingId = null;
        this.toast.error(friendlyApiErrorMessage(err, 'Could not revoke token.'));
      },
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  }

  statusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'aa-status--active';
    if (s === 'expired') return 'aa-status--expired';
    return 'aa-status--revoked';
  }
}
