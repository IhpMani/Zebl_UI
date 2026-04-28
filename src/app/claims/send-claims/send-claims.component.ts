import { Component, OnInit } from '@angular/core';
import { ClaimApiService } from '../../core/services/claim-api.service';
import {
  ClaimBatchDetail,
  ClaimBatchListItem,
  ClaimListItem
} from '../../core/services/claim.models';
import { ReceiverLibraryApiService, ReceiverLibraryDto } from '../../core/services/receiver-library-api.service';
import { ConnectionLibraryApiService, ConnectionLibraryDto, ConnectionType } from '../../core/services/connection-library-api.service';

export type SendClaimsClaimFilter = 'RTS' | 'Electronic' | 'All';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

@Component({
  selector: 'app-send-claims',
  templateUrl: './send-claims.component.html',
  styleUrls: ['./send-claims.component.css']
})
export class SendClaimsComponent implements OnInit {
  claims: ClaimListItem[] = [];
  submitterReceivers: ReceiverLibraryDto[] = [];
  connections: ConnectionLibraryDto[] = [];
  loading = false;
  loadingSubmitterReceivers = false;
  loadingConnections = false;
  sending = false;
  error: string | null = null;
  success: string | null = null;
  selected = new Set<number>();
  selectedSubmitterReceiverId: string | null = null;
  selectedConnectionLibraryId: string | null = null;

  claimFilter: SendClaimsClaimFilter = 'RTS';
  exportAsZip = false;

  /** Claims loaded from sendable / list filters vs a previous batch. */
  gridSource: 'filter' | 'batch' = 'filter';

  actionPanelOpen = true;

  showBatchPickerModal = false;
  loadingBatches = false;
  batches: ClaimBatchListItem[] = [];
  selectedBatchIdForPicker: string | null = null;
  batchPickerError: string | null = null;

  show837Modal = false;
  detail837Title = '837 / batch detail';
  detail837Body = '';

  lastBatchDetail: ClaimBatchDetail | null = null;

  constructor(
    private claimApi: ClaimApiService,
    private receiverLibraryApi: ReceiverLibraryApiService,
    private connectionLibraryApi: ConnectionLibraryApiService
  ) {}

  ngOnInit(): void {
    this.loadConnections();
    this.loadSubmitterReceivers();
    this.reloadGrid();
  }

  loadSubmitterReceivers(): void {
    this.loadingSubmitterReceivers = true;
    this.receiverLibraryApi.getAll().subscribe({
      next: (response) => {
        this.submitterReceivers = response?.data ?? [];
        this.loadingSubmitterReceivers = false;
      },
      error: () => {
        this.error = 'Failed to load submitter/receiver options.';
        this.loadingSubmitterReceivers = false;
      }
    });
  }

  loadConnections(): void {
    this.loadingConnections = true;
    this.connectionLibraryApi.getAll().subscribe({
      next: (rows) => {
        this.connections = (rows ?? []).filter(
          (c) => c?.isActive && (c.connectionType === ConnectionType.Sftp || c.connectionType === undefined)
        );
        this.loadingConnections = false;
      },
      error: () => {
        this.connections = [];
        this.loadingConnections = false;
      }
    });
  }

  onConnectionChange(value: string): void {
    this.selectedConnectionLibraryId = value || null;
  }

  onSubmitterReceiverChange(value: string): void {
    this.selectedSubmitterReceiverId = value || null;
  }


  onClaimFilterChange(): void {
    this.reloadGrid();
  }

  reloadGrid(): void {
    switch (this.claimFilter) {
      case 'RTS':
        this.loadSendableClaims();
        break;
      case 'Electronic':
        this.loadClaimsFromPagedList(true);
        break;
      case 'All':
        this.loadClaimsFromPagedList(false);
        break;
    }
  }

  /** Uses GET /api/claims/sendable (server-side ready-to-submit eligibility). */
  loadSendableClaims(): void {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.selected.clear();
    this.gridSource = 'filter';

    this.claimApi.getSendableClaims(1, 500).subscribe({
      next: (response) => {
        this.claims = response.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load sendable claims.';
        this.loading = false;
      }
    });
  }

  /** Uses GET /api/claims with paging; filters electronically submitted rows on the client when requested. */
  private loadClaimsFromPagedList(electronicOnly: boolean): void {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.selected.clear();
    this.gridSource = 'filter';

    const maxRows = 500;
    const pageSize = 100;
    const maxPages = 10;
    const acc: ClaimListItem[] = [];
    let page = 1;

    const loadPage = (): void => {
      this.claimApi.getClaims(page, pageSize).subscribe({
        next: (res) => {
          const rows = res.data ?? [];
          for (const r of rows) {
            if (!electronicOnly || this.isElectronicClaim(r)) {
              acc.push(r);
              if (acc.length >= maxRows) {
                break;
              }
            }
          }
          const done =
            acc.length >= maxRows || rows.length < pageSize || page >= maxPages;
          if (done) {
            this.claims = acc;
            this.loading = false;
          } else {
            page++;
            loadPage();
          }
        },
        error: () => {
          this.error = 'Failed to load claims.';
          this.loading = false;
        }
      });
    };

    loadPage();
  }

  private isElectronicClaim(r: ClaimListItem): boolean {
    return (r.claSubmissionMethod || '').trim().toLowerCase() === 'electronic';
  }

  toggleClaim(claId: number, checked: boolean): void {
    if (checked) {
      this.selected.add(claId);
    } else {
      this.selected.delete(claId);
    }
  }

  isSelected(claId: number): boolean {
    return this.selected.has(claId);
  }

  areAllSelected(): boolean {
    return this.claims.length > 0 && this.selected.size === this.claims.length;
  }

  toggleSelectAll(checked: boolean): void {
    this.selected.clear();
    if (checked) {
      for (const claim of this.claims) {
        this.selected.add(claim.claID);
      }
    }
  }

  closeActionPanel(): void {
    this.actionPanelOpen = false;
  }

  openActionPanel(): void {
    this.actionPanelOpen = true;
  }

  openBatchPicker(): void {
    this.batchPickerError = null;
    this.selectedBatchIdForPicker = null;
    this.showBatchPickerModal = true;
    this.loadingBatches = true;
    this.claimApi.getBatches(1, 100).subscribe({
      next: (res) => {
        this.batches = res.data ?? [];
        this.loadingBatches = false;
      },
      error: () => {
        this.batchPickerError = 'Failed to load batches.';
        this.loadingBatches = false;
      }
    });
  }

  closeBatchPicker(): void {
    this.showBatchPickerModal = false;
  }

  confirmBatchPicker(): void {
    if (!this.selectedBatchIdForPicker) {
      this.batchPickerError = 'Select a batch.';
      return;
    }
    this.batchPickerError = null;
    this.loading = true;
    this.claimApi.getBatchById(this.selectedBatchIdForPicker).subscribe({
      next: (detail) => {
        this.claims = this.mapBatchItemsToClaimRows(detail);
        this.gridSource = 'batch';
        this.lastBatchDetail = detail;
        this.selected.clear();
        this.loading = false;
        this.showBatchPickerModal = false;
        this.success = `Loaded ${detail.items.length} claim(s) from batch ${detail.id}.`;
      },
      error: () => {
        this.error = 'Failed to load batch claims.';
        this.loading = false;
      }
    });
  }

  private mapBatchItemsToClaimRows(detail: ClaimBatchDetail): ClaimListItem[] {
    return detail.items.map((i) => ({
      claID: i.claimId,
      claStatus: i.status,
      claSubmissionMethod: null,
      claDateTimeCreated: i.createdAt,
      claTotalChargeTRIG: null,
      claTotalAmtPaidCC: null,
      claTotalBalanceCC: null,
      claClassification: null,
      claFirstDateTRIG: null,
      claLastDateTRIG: null,
      claPatFID: 0,
      claAttendingPhyFID: 0,
      claBillingPhyFID: 0,
      claReferringPhyFID: 0,
      claBillDate: null,
      claTypeOfBill: null,
      claAdmissionType: null,
      claPatientStatus: null,
      claDiagnosis1: null,
      claDiagnosis2: null,
      claDiagnosis3: null,
      claDiagnosis4: null,
      additionalColumns: { batchItemError: i.errorMessage ?? '' }
    }));
  }

  open837DetailView(): void {
    this.detail837Title = '837 / batch detail';
    if (!this.lastBatchDetail) {
      this.error = 'Load or create a batch before opening 837 Detailed View.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.claimApi.getBatchEdi(this.lastBatchDetail.id).subscribe({
      next: (res) => {
        this.detail837Body = res.ediContent || '';
        this.show837Modal = true;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load EDI content.';
        this.loading = false;
      }
    });
  }

  close837Modal(): void {
    this.show837Modal = false;
  }

  createAndSendBatch(): void {
    if (this.sending || this.loading) {
      return;
    }

    if (this.selected.size === 0) {
      this.error = 'Please select at least one claim.';
      this.success = null;
      return;
    }

    if (!this.selectedSubmitterReceiverId) {
      this.error = 'Please select a Submitter/Receiver.';
      this.success = null;
      return;
    }

    if (!this.selectedConnectionLibraryId) {
      this.error = 'Please select a Connection.';
      this.success = null;
      return;
    }

    this.sending = true;
    this.error = null;
    this.success = null;

    const claimIds = Array.from(this.selected);
    const sendBatchPayload = {
      claimIds,
      submitterReceiverId: this.selectedSubmitterReceiverId,
      connectionType: 'Clearinghouse',
      connectionLibraryId: this.selectedConnectionLibraryId
    };
    console.log('[SendBatch][UI] button click -> POST /api/claims/send-batch', sendBatchPayload);
    this.claimApi
      .sendBatch(sendBatchPayload)
      .subscribe({
        next: (res) => {
          const total = res.total ?? claimIds.length;
          const successCount = res.successCount ?? res.submittedCount ?? 0;
          const failureCount = res.failureCount ?? 0;
          const filePathMsg = res.filePath ? ` File: ${res.filePath}` : '';
          this.success =
            `Batch ${res.batchId}: ${successCount}/${total} claims sent successfully` +
            (failureCount > 0 ? `, ${failureCount} failed.` : '.') +
            filePathMsg;

          this.claimApi.getBatchById(res.batchId).subscribe({
            next: (d) => {
              this.lastBatchDetail = d;
            },
            error: () => {
              /* non-blocking */
            }
          });

          if (this.exportAsZip) {
            this.claimApi.exportBatchZip(res.batchId).subscribe({
              next: (blob) => {
                downloadBlob(blob, `batch-${res.batchId}.zip`);
              },
              error: () => {
                this.error = 'Batch sent, but zip export failed.';
              }
            });
          }

          this.sending = false;
          if (this.gridSource === 'batch' && this.lastBatchDetail) {
            this.claimApi.getBatchById(this.lastBatchDetail.id).subscribe({
              next: (detail) => {
                this.claims = this.mapBatchItemsToClaimRows(detail);
                this.lastBatchDetail = detail;
              },
              error: () => {
                this.reloadGrid();
              }
            });
          } else {
            this.reloadGrid();
          }
        },
        error: (err) => {
          const message = err?.error?.message || 'Batch send failed.';
          this.error = message;
          this.sending = false;
        }
      });
  }
}
