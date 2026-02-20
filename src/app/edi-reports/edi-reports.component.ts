import { Component, OnInit } from '@angular/core';
import { EdiReportsApiService, EdiReportDto } from '../core/services/edi-reports-api.service';
import { ConnectionLibraryApiService } from '../core/services/connection-library-api.service';
import { ReceiverLibraryApiService, ReceiverLibraryDto } from '../core/services/receiver-library-api.service';

@Component({
  selector: 'app-edi-reports',
  templateUrl: './edi-reports.component.html',
  styleUrls: ['./edi-reports.component.scss']
})
export class EdiReportsComponent implements OnInit {
  connections: { id: string; name: string }[] = [];
  receivers: ReceiverLibraryDto[] = [];
  reports: EdiReportDto[] = [];
  selectedConnectionId = '';
  selectedReceiverId = '';
  loading = false;
  error: string | null = null;
  sortColumn: string | null = null;
  sortAsc = true;
  filterText = '';
  showArchived = false;
  showAddForm = false;
  addForm = { receiverLibraryId: '', claimId: 0, fileType: '837' };
  addFormSaving = false;
  addFormError: string | null = null;
  previewContent: string | null = null;
  previewFileName: string | null = null;
  selectedReport: EdiReportDto | null = null;
  noteEditText = '';
  showNoteModal = false;
  noteSaving = false;

  constructor(
    private ediApi: EdiReportsApiService,
    private connectionApi: ConnectionLibraryApiService,
    private receiverApi: ReceiverLibraryApiService
  ) {}

  ngOnInit(): void {
    this.loadConnections();
    this.loadReceivers();
    this.loadReports();
  }

  loadConnections(): void {
    this.connectionApi.getAll().subscribe({
      next: (list) => {
        this.connections = (list || []).map(c => ({ id: c.id, name: c.name }));
        if (this.connections.length && !this.selectedConnectionId)
          this.selectedConnectionId = this.connections[0].id;
      },
      error: () => this.connections = []
    });
  }

  loadReceivers(): void {
    this.receiverApi.getAll().subscribe({
      next: (res) => {
        const data = (res as { data?: ReceiverLibraryDto[] })?.data;
        this.receivers = Array.isArray(data) ? data : [];
        if (this.receivers.length && !this.selectedReceiverId)
          this.selectedReceiverId = this.receivers[0].id;
      },
      error: () => this.receivers = []
    });
  }

  loadReports(): void {
    this.loading = true;
    this.error = null;
    this.ediApi.getAll(this.showArchived).subscribe({
      next: (list) => {
        this.reports = Array.isArray(list) ? list : [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Failed to load reports';
        this.loading = false;
      }
    });
  }

  get filteredReports(): EdiReportDto[] {
    let list = [...this.reports];
    if (this.filterText.trim()) {
      const q = this.filterText.toLowerCase();
      list = list.filter(r =>
        (r.fileName || '').toLowerCase().includes(q) ||
        (r.fileType || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q) ||
        (r.payerName || '').toLowerCase().includes(q) ||
        (r.traceNumber || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q)
      );
    }
    if (this.sortColumn) {
      const col = this.sortColumn;
      list.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[col];
        const bVal = (b as unknown as Record<string, unknown>)[col];
        const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true });
        return this.sortAsc ? cmp : -cmp;
      });
    }
    return list;
  }

  sortBy(col: string): void {
    if (this.sortColumn === col) this.sortAsc = !this.sortAsc;
    else { this.sortColumn = col; this.sortAsc = true; }
  }

  getReports(): void {
    if (!this.selectedConnectionId || !this.selectedReceiverId) {
      this.error = 'Select Connection and Receiver first.';
      return;
    }
    this.loading = true;
    this.error = null;
    this.ediApi.download(this.selectedConnectionId, this.selectedReceiverId).subscribe({
      next: () => {
        this.loading = false;
        this.loadReports();
      },
      error: (err) => {
        this.error = err?.error?.error || err?.message || 'Download failed';
        this.loading = false;
      }
    });
  }

  openAddForm(): void {
    this.showAddForm = true;
    this.addFormError = null;
    this.addForm = { receiverLibraryId: this.selectedReceiverId || '', claimId: 0, fileType: '837' };
  }

  cancelAddForm(): void {
    this.showAddForm = false;
  }

  submitAddForm(): void {
    if (!this.addForm.receiverLibraryId || !this.addForm.claimId) {
      this.addFormError = 'Receiver and Claim ID are required.';
      return;
    }
    this.addFormSaving = true;
    this.addFormError = null;
    this.ediApi.generate({
      receiverLibraryId: this.addForm.receiverLibraryId,
      claimId: this.addForm.claimId,
      connectionLibraryId: this.selectedConnectionId || undefined,
      fileType: this.addForm.fileType
    }).subscribe({
      next: () => {
        this.addFormSaving = false;
        this.showAddForm = false;
        this.loadReports();
      },
      error: (err) => {
        this.addFormError = err?.error?.error || err?.message || 'Generate failed';
        this.addFormSaving = false;
      }
    });
  }

  refreshReports(): void {
    this.loadReports();
  }

  close(): void {
    this.previewContent = null;
    this.previewFileName = null;
  }

  archiveReport(r: EdiReportDto): void {
    if (r.isArchived) return;
    if (!confirm(`Archive "${r.fileName}"?`)) return;
    this.ediApi.archive(r.id).subscribe({
      next: () => this.loadReports(),
      error: (err) => this.error = err?.error?.error || err?.message || 'Archive failed'
    });
  }

  onRowDoubleClick(r: EdiReportDto): void {
    this.openFullViewer(r);
  }

  openFullViewer(r: EdiReportDto): void {
    this.selectedReport = r;
    this.ediApi.getContent(r.id, false).subscribe({
      next: (content) => {
        this.previewContent = content;
        this.previewFileName = r.fileName;
      },
      error: () => this.error = 'Could not load file content.'
    });
  }

  openQuickView(r: EdiReportDto): void {
    this.selectedReport = r;
    this.ediApi.getContent(r.id, true).subscribe({
      next: (content) => {
        this.previewContent = content;
        this.previewFileName = r.fileName;
      },
      error: () => this.error = 'Could not load file content.'
    });
  }

  exportFile(r: EdiReportDto): void {
    this.ediApi.exportFile(r.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => this.error = err?.error?.error || err?.message || 'Export failed'
    });
  }

  markAsRead(r: EdiReportDto): void {
    if (r.isRead) return;
    this.ediApi.markAsRead(r.id).subscribe({
      next: () => this.loadReports(),
      error: (err) => this.error = err?.error?.error || err?.message || 'Mark as read failed'
    });
  }

  openNoteEditor(r: EdiReportDto): void {
    this.selectedReport = r;
    this.noteEditText = r.note || '';
    this.showNoteModal = true;
  }

  saveNote(): void {
    if (!this.selectedReport) return;
    this.noteSaving = true;
    this.ediApi.updateNote(this.selectedReport.id, this.noteEditText || null).subscribe({
      next: () => {
        this.noteSaving = false;
        this.showNoteModal = false;
        this.loadReports();
      },
      error: (err) => {
        this.error = err?.error?.error || err?.message || 'Save note failed';
        this.noteSaving = false;
      }
    });
  }

  cancelNoteEdit(): void {
    this.showNoteModal = false;
    this.selectedReport = null;
    this.noteEditText = '';
  }

  deleteReport(r: EdiReportDto): void {
    if (!confirm(`Permanently delete "${r.fileName}"? This cannot be undone.`)) return;
    this.ediApi.delete(r.id).subscribe({
      next: () => this.loadReports(),
      error: (err) => this.error = err?.error?.error || err?.message || 'Delete failed'
    });
  }

  sendReport(r: EdiReportDto): void {
    if (r.status === 'Sent') return;
    if (!confirm(`Send "${r.fileName}"?`)) return;
    // TODO: Implement send endpoint call
    this.error = 'Send functionality not yet implemented in frontend.';
  }

  statusClass(status: string): string {
    if (status === 'Sent') return 'status-sent';
    if (status === 'Failed') return 'status-failed';
    if (status === 'Received') return 'status-received';
    return '';
  }

  dateDisplay(r: EdiReportDto): string {
    const d = r.sentAt || r.receivedAt || r.createdAt;
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
