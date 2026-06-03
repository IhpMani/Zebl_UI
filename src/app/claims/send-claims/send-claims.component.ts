import { Component, HostListener, OnInit } from '@angular/core';
import { ClaimApiService } from '../../core/services/claim-api.service';
import {
  ClaimBatchDetail,
  ClaimBatchListItem,
  ClaimListItem
} from '../../core/services/claim.models';
import { ReceiverLibraryApiService, ReceiverLibraryDto } from '../../core/services/receiver-library-api.service';
import { ConnectionLibraryApiService, ConnectionLibraryDto, ConnectionType } from '../../core/services/connection-library-api.service';
import { ClaimListAdditionalColumns } from '../claim-list/claim-list-additional-columns';
import {
  ClaimListSortDirection,
  formatClaimListDateDisplay,
  formatClaimListDefaultCellValue,
  getClaimCurrencyTone,
  getClaimListCellValue,
  getClaimStatusTone,
  mapToBackendAdditionalColumnKeys,
  mergeClaimListRowsForBatch,
  sortClaimListItems
} from '../shared/claim-column.utils';
import {
  buildColumnPreferencesPayload,
  clampColumnWidth,
  migrateLegacyColumnKey,
  orderVisibleColumns,
  parseColumnPreferences,
  reorderColumnKeys,
  SEND_CLAIMS_COLUMN_PREFS_VERSION,
  visibleKeysInDisplayOrder
} from '../shared/claim-column-preferences';
import { Router } from '@angular/router';

export type SendClaimsGridColumn = {
  key: string;
  label: string;
  visible: boolean;
  isAdditionalColumn?: boolean;
};

export type SendClaimsClaimFilter = 'RTS' | 'Electronic' | 'All';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * HTTP 409 from POST /api/claims/send-batch is used for two cases:
 * (1) All selected claims blocked by send eligibility — body is SendBatchResponseDto
 *     with `blockedClaims` (often no top-level `message`).
 * (2) BATCH_CONFLICT / BATCH_CONCURRENCY — body is ErrorResponseDto with `message`.
 */
function pick<T>(obj: Record<string, unknown> | undefined, camel: string, pascal: string): T | undefined {
  if (!obj) return undefined;
  const c = obj[camel];
  if (c !== undefined && c !== null) return c as T;
  const p = obj[pascal];
  if (p !== undefined && p !== null) return p as T;
  return undefined;
}

function formatSendBatchHttpError(err: unknown): string {
  const httpErr = err as { error?: unknown; message?: string };
  const raw = httpErr?.error;

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return formatSendBatchBody(parsed);
    } catch {
      return raw || httpErr?.message || 'Batch send failed.';
    }
  }

  if (raw && typeof raw === 'object') {
    return formatSendBatchBody(raw as Record<string, unknown>);
  }

  return httpErr?.message || 'Batch send failed (no response body). Open Network → send-batch → Response.';
}

function formatSendBatchBody(body: Record<string, unknown>): string {
  const errorCode = pick<string>(body, 'errorCode', 'ErrorCode');
  const message = pick<string>(body, 'message', 'Message');
  if (errorCode) {
    const parts = [errorCode];
    if (message) parts.push(message);
    return parts.join(': ');
  }

  const blockedRaw = pick<unknown[]>(body, 'blockedClaims', 'BlockedClaims');
  if (Array.isArray(blockedRaw) && blockedRaw.length > 0) {
    const lines = blockedRaw.map((row) => {
      if (!row || typeof row !== 'object') return 'Claim: blocked';
      const r = row as Record<string, unknown>;
      const claimId = pick<number | string>(r, 'claimId', 'ClaimId');
      const id = claimId != null && `${claimId}`.length > 0 ? `Claim ${claimId}` : 'Claim';
      const ruleCode = pick<string>(r, 'ruleCode', 'RuleCode');
      const reason = pick<string>(r, 'reason', 'Reason') || 'Blocked';
      const code = ruleCode ? ` [${ruleCode}]` : '';
      return `${id}${code}: ${reason}`;
    });
    const batchId = pick<string>(body, 'batchId', 'BatchId');
    const batch = batchId ? ` Batch id: ${batchId}.` : '';
    let msg = `Cannot send — all selected claims were blocked.${batch}\n${lines.join('\n')}`;
    const needsForce = blockedRaw.some((row) => {
      if (!row || typeof row !== 'object') return false;
      const code = pick<string>(row as Record<string, unknown>, 'ruleCode', 'RuleCode');
      return code === 'ALREADY_SUBMITTED_OR_RECENTLY_EXPORTED';
    });
    if (needsForce) {
      msg +=
        '\n\nTip: enable "Force resubmit" in the right-hand Batch workflow panel, then send again.';
    }
    return msg;
  }

  const failedRaw = pick<unknown[]>(body, 'failedClaims', 'FailedClaims');
  if (Array.isArray(failedRaw) && failedRaw.length > 0) {
    const lines = failedRaw.map((row) => {
      if (!row || typeof row !== 'object') return 'Claim: failed';
      const r = row as Record<string, unknown>;
      const claimId = pick<number | string>(r, 'claimId', 'ClaimId');
      const id = claimId != null && `${claimId}`.length > 0 ? `Claim ${claimId}` : 'Claim';
      const errMsg = pick<string>(r, 'errorMessage', 'ErrorMessage') || 'Failed';
      return `${id}: ${errMsg}`;
    });
    const batchId = pick<string>(body, 'batchId', 'BatchId');
    const total = pick<number | string>(body, 'total', 'Total');
    const failureCount = pick<number | string>(body, 'failureCount', 'FailureCount');
    const successCount = pick<number | string>(body, 'successCount', 'SuccessCount');
    const batch = batchId ? ` Batch id: ${batchId}.` : '';
    const sc = successCount != null ? Number(successCount) : undefined;
    const fc = failureCount != null ? Number(failureCount) : failedRaw.length;
    const tot = total != null ? Number(total) : undefined;
    const counts =
      sc !== undefined || fc > 0 || tot !== undefined
        ? ` (${sc ?? 0} sent, ${fc} failed${tot !== undefined ? ` of ${tot}` : ''}).`
        : '.';
    return `Batch send did not complete successfully.${batch}${counts}\n${lines.join('\n')}`;
  }

  if (message) {
    return message;
  }

  return 'Batch send failed. Open DevTools → Network → failed send-batch → Response tab for JSON details.';
}

@Component({
  selector: 'app-send-claims',
  templateUrl: './send-claims.component.html',
  styleUrls: ['./send-claims.component.css']
})
export class SendClaimsComponent implements OnInit {
  private readonly columnPreferenceVersion = SEND_CLAIMS_COLUMN_PREFS_VERSION;
  private readonly sendClaimsColumnPrefsKey = 'sendClaimsColumnPreferences';
  private readonly defaultSendClaimsColumns: Array<{ key: string; label: string }> = [
    { key: 'claID', label: 'Claim ID' },
    { key: 'claStatus', label: 'Status' },
    { key: 'claSubmissionMethod', label: 'Submission Method' },
    { key: 'claTotalChargeTRIG', label: 'Total Charge' },
    { key: 'claTotalBalanceCC', label: 'Total Balance' }
  ];

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
  /** When true, API skips "already submitted / exported in last 5 minutes" guard. */
  forceResubmit = false;

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

  columns: SendClaimsGridColumn[] = [
    { key: 'claID', label: 'Claim ID', visible: true },
    { key: 'claStatus', label: 'Status', visible: true },
    { key: 'claSubmissionMethod', label: 'Submission Method', visible: true },
    { key: 'claTotalChargeTRIG', label: 'Total Charge', visible: true },
    { key: 'claTotalBalanceCC', label: 'Total Balance', visible: true }
  ];
  selectedAdditionalColumns = new Set<string>();
  showCustomizationDialog = false;
  columnSearchText = '';
  columnDisplayOrder: string[] = [];
  columnWidths: Record<string, number> = {};
  sortColumnKey: string | null = null;
  sortDirection: ClaimListSortDirection = 'asc';
  private dragColumnKey: string | null = null;
  private resizingColumnKey: string | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  constructor(
    private claimApi: ClaimApiService,
    private receiverLibraryApi: ReceiverLibraryApiService,
    private connectionLibraryApi: ConnectionLibraryApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadColumnPreferences();
    this.loadConnections();
    this.loadSubmitterReceivers();
    this.reloadGrid();
  }

  get visibleColumns(): SendClaimsGridColumn[] {
    return orderVisibleColumns(this.columns, this.columnDisplayOrder);
  }

  get selectedColumnKeysForDialog(): string[] {
    return this.visibleColumns.map((c) => c.key);
  }

  get displayClaims(): ClaimListItem[] {
    if (!this.sortColumnKey) {
      return this.claims;
    }
    return sortClaimListItems(this.claims, this.sortColumnKey, this.sortDirection);
  }

  get tableColspan(): number {
    return 1 + this.visibleColumns.length + (this.gridSource === 'batch' ? 1 : 0);
  }

  private buildAdditionalColumnsRequest(): string[] | undefined {
    const visibleAdditionalKeys = this.columns
      .filter((c) => c.visible && ClaimListAdditionalColumns.isValidColumn(c.key))
      .map((c) => c.key);
    const keys = mapToBackendAdditionalColumnKeys([
      ...Array.from(this.selectedAdditionalColumns),
      ...visibleAdditionalKeys
    ]);
    return keys.length > 0 ? keys : undefined;
  }

  loadSubmitterReceivers(): void {
    this.loadingSubmitterReceivers = true;
    this.receiverLibraryApi.getAll().subscribe({
      next: (response) => {
        this.submitterReceivers = response?.data ?? [];
        this.applyDefaultSubmitterReceiverSelection();
        this.loadingSubmitterReceivers = false;
      },
      error: () => {
        this.error = 'Failed to load submitter/receiver options.';
        this.submitterReceivers = [];
        this.selectedSubmitterReceiverId = null;
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
        this.applyDefaultConnectionSelection();
        this.loadingConnections = false;
      },
      error: () => {
        this.connections = [];
        this.selectedConnectionLibraryId = null;
        this.loadingConnections = false;
      }
    });
  }

  onConnectionChange(value: string): void {
    this.selectedConnectionLibraryId = value || null;
  }

  /** When nothing is selected or the selection is gone, pick the first connection (e.g. only one SFTP row). */
  private applyDefaultConnectionSelection(): void {
    if (this.connections.length === 0) {
      this.selectedConnectionLibraryId = null;
      return;
    }
    const current = this.selectedConnectionLibraryId;
    const stillValid = current != null && current !== '' && this.connections.some((c) => c.id === current);
    if (!stillValid) {
      this.selectedConnectionLibraryId = this.connections[0].id;
    }
  }

  /** When nothing is selected or the selection is gone, pick the first submitter/receiver library row. */
  private applyDefaultSubmitterReceiverSelection(): void {
    if (this.submitterReceivers.length === 0) {
      this.selectedSubmitterReceiverId = null;
      return;
    }
    const current = this.selectedSubmitterReceiverId;
    const stillValid = current != null && current !== '' && this.submitterReceivers.some((r) => r.id === current);
    if (!stillValid) {
      this.selectedSubmitterReceiverId = this.submitterReceivers[0].id;
    }
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

    this.claimApi.getSendableClaims(1, 500, this.buildAdditionalColumnsRequest()).subscribe({
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

    const additionalColumns = this.buildAdditionalColumnsRequest();
    const listFilters = additionalColumns ? { additionalColumns } : undefined;

    const loadPage = (): void => {
      this.claimApi.getClaims(page, pageSize, listFilters).subscribe({
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

  openClaimDetails(claimId: number): void {
    if (!claimId || claimId <= 0) {
      return;
    }
    this.router.navigate(['/claims', claimId]);
  }

  getCellValue(claim: ClaimListItem, key: string): any {
    return getClaimListCellValue(claim, key);
  }

  formatDefaultCellValue(claim: ClaimListItem, columnKey: string): string {
    return formatClaimListDefaultCellValue(claim, columnKey, (key) =>
      ClaimListAdditionalColumns.findByKey(key)?.dataType
    );
  }

  formatDateDisplay(value: unknown): string {
    return formatClaimListDateDisplay(value);
  }

  getStatusTone(status: unknown): string {
    return getClaimStatusTone(status);
  }

  getCurrencyTone(amount: unknown): string {
    return getClaimCurrencyTone(amount);
  }

  toggleCustomizationDialog(): void {
    this.showCustomizationDialog = !this.showCustomizationDialog;
    if (!this.showCustomizationDialog) {
      this.columnSearchText = '';
    }
  }

  onAddColumnDialogClosed(): void {
    this.showCustomizationDialog = false;
    this.columnSearchText = '';
  }

  toggleSort(columnKey: string): void {
    if (this.sortColumnKey === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumnKey = columnKey;
      this.sortDirection = 'asc';
    }
  }

  getSortIndicator(columnKey: string): string {
    if (this.sortColumnKey !== columnKey) return '';
    return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  getColumnWidthPx(key: string): number | null {
    const w = this.columnWidths[key];
    return w != null && w > 0 ? w : null;
  }

  onColumnDragStart(event: DragEvent, columnKey: string): void {
    this.dragColumnKey = columnKey;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', columnKey);
    }
  }

  onColumnDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onColumnDrop(event: DragEvent, targetKey: string): void {
    event.preventDefault();
    const dragged = this.dragColumnKey ?? event.dataTransfer?.getData('text/plain');
    this.dragColumnKey = null;
    if (!dragged || dragged === targetKey) return;
    const currentOrder = visibleKeysInDisplayOrder(this.columns, this.columnDisplayOrder);
    this.columnDisplayOrder = reorderColumnKeys(currentOrder, dragged, targetKey);
    this.saveColumnPreferences();
  }

  onColumnResizeStart(event: MouseEvent, columnKey: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizingColumnKey = columnKey;
    this.resizeStartX = event.clientX;
    const th = (event.target as HTMLElement).closest('th');
    this.resizeStartWidth = this.columnWidths[columnKey] ?? th?.clientWidth ?? 120;
  }

  onColumnResizeMove(event: MouseEvent): void {
    if (!this.resizingColumnKey) return;
    const delta = event.clientX - this.resizeStartX;
    this.columnWidths = {
      ...this.columnWidths,
      [this.resizingColumnKey]: clampColumnWidth(this.resizeStartWidth + delta)
    };
  }

  onColumnResizeEnd(): void {
    if (!this.resizingColumnKey) return;
    this.resizingColumnKey = null;
    this.saveColumnPreferences();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    this.onColumnResizeMove(event);
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    this.onColumnResizeEnd();
  }

  toggleColumnVisibility(columnKey: string): void {
    const additionalCol = ClaimListAdditionalColumns.findByKey(columnKey);
    if (additionalCol) {
      const existingCol = this.columns.find((c) => c.key === columnKey);
      if (existingCol) {
        existingCol.visible = !existingCol.visible;
        if (existingCol.visible) {
          this.selectedAdditionalColumns.add(columnKey);
        } else {
          this.selectedAdditionalColumns.delete(columnKey);
        }
      } else {
        this.columns.push({
          key: additionalCol.key,
          label: additionalCol.label,
          visible: true,
          isAdditionalColumn: true
        });
        this.selectedAdditionalColumns.add(columnKey);
      }
      if (!this.columnDisplayOrder.includes(columnKey)) {
        this.columnDisplayOrder = [...this.columnDisplayOrder, columnKey];
      }
      this.saveColumnPreferences();
      this.onColumnsChanged();
      return;
    }

    const col = this.columns.find((c) => c.key === columnKey);
    if (col) {
      col.visible = !col.visible;
      if (col.visible && !this.columnDisplayOrder.includes(columnKey)) {
        this.columnDisplayOrder = [...this.columnDisplayOrder, columnKey];
      }
      this.saveColumnPreferences();
      this.onColumnsChanged();
    }
  }

  hideColumn(columnKey: string): void {
    const col = this.columns.find((c) => c.key === columnKey);
    if (!col) return;
    col.visible = false;
    if (ClaimListAdditionalColumns.isValidColumn(columnKey)) {
      this.selectedAdditionalColumns.delete(columnKey);
    }
    this.saveColumnPreferences();
    this.onColumnsChanged();
  }

  private onColumnsChanged(): void {
    if (this.gridSource === 'filter') {
      this.reloadGrid();
    }
  }

  saveColumnPreferences(): void {
    const preferences = buildColumnPreferencesPayload(
      this.columnPreferenceVersion,
      visibleKeysInDisplayOrder(this.columns, this.columnDisplayOrder),
      this.selectedAdditionalColumns,
      this.columnWidths
    );
    localStorage.setItem(this.sendClaimsColumnPrefsKey, JSON.stringify(preferences));
    this.columnDisplayOrder = preferences.visibleColumns;
  }

  loadColumnPreferences(): void {
    const preferences = parseColumnPreferences(localStorage.getItem(this.sendClaimsColumnPrefsKey));
    if (!preferences) {
      this.applyDefaultColumnConfiguration();
      return;
    }

    try {
      const visibleKeys = new Set(preferences.visibleColumns.map(migrateLegacyColumnKey));
      this.columnDisplayOrder = preferences.visibleColumns.map(migrateLegacyColumnKey);
      this.columnWidths = { ...(preferences.columnWidths ?? {}) };

      this.columns.forEach((col) => {
        col.visible = visibleKeys.has(col.key);
      });

      if (preferences.selectedAdditional) {
        preferences.selectedAdditional.forEach((key: string) => {
          const resolvedKey = migrateLegacyColumnKey(key);
          const additionalCol = ClaimListAdditionalColumns.findByKey(resolvedKey);
          if (additionalCol && !this.columns.some((c) => c.key === resolvedKey)) {
            this.columns.push({
              key: additionalCol.key,
              label: additionalCol.label,
              visible: true,
              isAdditionalColumn: true
            });
            this.selectedAdditionalColumns.add(resolvedKey);
          }
        });
      }

      this.columns.forEach((col) => {
        if (col.visible && ClaimListAdditionalColumns.isValidColumn(col.key)) {
          this.selectedAdditionalColumns.add(col.key);
        }
      });
    } catch {
      this.applyDefaultColumnConfiguration();
    }
  }

  private applyDefaultColumnConfiguration(): void {
    const defaultKeys = new Set(this.defaultSendClaimsColumns.map((c) => c.key));
    this.columns.forEach((col) => {
      col.visible = defaultKeys.has(col.key);
      const configured = this.defaultSendClaimsColumns.find((c) => c.key === col.key);
      if (configured) col.label = configured.label;
    });
    this.defaultSendClaimsColumns.forEach((def) => {
      if (!this.columns.some((c) => c.key === def.key)) {
        this.columns.push({
          key: def.key,
          label: def.label,
          visible: true,
          isAdditionalColumn: ClaimListAdditionalColumns.isValidColumn(def.key)
        });
      }
    });
    this.selectedAdditionalColumns = new Set();
    this.columnDisplayOrder = this.defaultSendClaimsColumns.map((c) => c.key);
  }

  clearAllColumns(): void {
    this.columns.forEach((col) => (col.visible = false));
    this.selectedAdditionalColumns.clear();
    this.columnDisplayOrder = [];
    this.saveColumnPreferences();
    this.onColumnsChanged();
  }

  private enrichBatchClaimsGrid(stubRows: ClaimListItem[], onDone: (rows: ClaimListItem[]) => void): void {
    const claimIds = stubRows.map((r) => r.claID).filter((id) => id > 0);
    if (claimIds.length === 0) {
      onDone(stubRows);
      return;
    }

    const idSet = new Set(claimIds);
    const minId = Math.min(...claimIds);
    const maxId = Math.max(...claimIds);
    const additionalColumns = this.buildAdditionalColumnsRequest();

    this.claimApi
      .getClaims(1, 500, {
        additionalColumns,
        minClaimId: minId,
        maxClaimId: maxId
      })
      .subscribe({
        next: (res) => {
          const apiRows = (res.data ?? []).filter((c) => idSet.has(c.claID));
          onDone(mergeClaimListRowsForBatch(stubRows, apiRows));
        },
        error: () => onDone(stubRows)
      });
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
        const stubs = this.mapBatchItemsToClaimRows(detail);
        this.gridSource = 'batch';
        this.lastBatchDetail = detail;
        this.selected.clear();
        this.enrichBatchClaimsGrid(stubs, (rows) => {
          this.claims = rows;
          this.loading = false;
          this.showBatchPickerModal = false;
          this.success = `Loaded ${detail.items.length} claim(s) from batch ${detail.id}.`;
        });
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
      connectionLibraryId: this.selectedConnectionLibraryId,
      forceResubmit: this.forceResubmit
    };
    console.log('[SendBatch][UI] button click -> POST /api/claims/send-batch', sendBatchPayload);
    this.claimApi
      .sendBatch(sendBatchPayload)
      .subscribe({
        next: (res) => {
          if (res.success === false) {
            this.success = null;
            this.error = formatSendBatchBody(res as unknown as Record<string, unknown>);
            this.sending = false;
            if (this.gridSource === 'batch') {
              this.claimApi.getBatchById(res.batchId).subscribe({
                next: (detail) => {
                  this.enrichBatchClaimsGrid(this.mapBatchItemsToClaimRows(detail), (rows) => {
                    this.claims = rows;
                    this.lastBatchDetail = detail;
                  });
                },
                error: () => {
                  this.reloadGrid();
                }
              });
            } else {
              this.reloadGrid();
            }
            return;
          }

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
                this.enrichBatchClaimsGrid(this.mapBatchItemsToClaimRows(detail), (rows) => {
                  this.claims = rows;
                  this.lastBatchDetail = detail;
                });
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
          this.error = formatSendBatchHttpError(err);
          this.sending = false;
        }
      });
  }
}
