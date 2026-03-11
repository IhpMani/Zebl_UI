import { Component, Input, OnChanges } from '@angular/core';
import { CodeLibraryApiService } from '../../core/services/code-library-api.service';
import { CodeEditModel } from './code-edit-dialog.component';
import { CodeLibraryTab } from './code-library-page.component';

@Component({
  selector: 'app-code-library-grid',
  templateUrl: './code-library-grid.component.html',
  styleUrls: ['./code-library-grid.component.scss']
})
export class CodeLibraryGridComponent implements OnChanges {
  @Input() activeTab!: CodeLibraryTab;

  rowData: any[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 50;
  search = '';
  loading = false;
  error: string | null = null;

  showImportDialog = false;
  showLookupDialog = false;
  showEditDialog = false;
  editPayload: CodeEditModel | null = null;
  selectedRow: any | null = null;

  constructor(private api: CodeLibraryApiService) {}

  ngOnChanges(): void {
    this.page = 1;
    this.selectedRow = null;
    this.loadPage();
  }

  get columns(): { key: string; label: string; className?: string }[] {
    if (this.activeTab === 'procedures') {
      return [
        { key: 'procCode', label: 'Code' },
        { key: 'procDescription', label: 'Description' },
        { key: 'procDateTimeCreated', label: 'Created', className: 'col-date' },
        { key: 'procDateTimeModified', label: 'Updated', className: 'col-date' }
      ];
    }
    if (this.activeTab === 'icd9' || this.activeTab === 'icd10') {
      return [
        { key: 'code', label: 'Code' },
        { key: 'description', label: 'Description' },
        { key: 'codeType', label: 'Type', className: 'col-small' },
        { key: 'isActive', label: 'Active', className: 'col-small' },
        { key: 'createdAt', label: 'Created', className: 'col-date' },
        { key: 'updatedAt', label: 'Updated', className: 'col-date' }
      ];
    }
    return [
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Description' },
      { key: 'isActive', label: 'Active', className: 'col-small' },
      { key: 'createdAt', label: 'Created', className: 'col-date' },
      { key: 'updatedAt', label: 'Updated', className: 'col-date' }
    ];
  }

  getRowKey(row: any): string {
    if (!row) return '';
    return String(row.id ?? row.procID ?? '');
  }

  trackByRow = (_: number, row: any) => this.getRowKey(row);

  onRowClick(row: any): void {
    this.selectedRow = row;
  }

  isSelected(row: any): boolean {
    return this.getRowKey(this.selectedRow) !== '' && this.getRowKey(this.selectedRow) === this.getRowKey(row);
  }

  getCell(row: any, key: string): any {
    const v = row?.[key];
    if (key === 'isActive') return v ? 'Yes' : 'No';
    return v ?? '';
  }

  loadPage(): void {
    if (!this.activeTab) return;
    this.loading = true;
    this.error = null;
    const searchTrim = this.search?.trim() || undefined;

    const next = (items: unknown[], total: number) => {
      this.rowData = (items as any[]) ?? [];
      this.totalCount = total;
      this.loading = false;
    };
    const err = (msg: string) => {
      this.error = msg;
      this.loading = false;
    };

    switch (this.activeTab) {
      case 'procedures':
        this.api.getProcedures(this.page, this.pageSize, searchTrim).subscribe({
          next: res => next(res.items, res.totalCount),
          error: e => err(e?.message || 'Failed to load procedures')
        });
        break;
      case 'icd9':
        this.api.getDiagnosis(this.page, this.pageSize, searchTrim, true, 'ICD9').subscribe({
          next: res => next(res.items, res.totalCount),
          error: e => err(e?.message || 'Failed to load diagnosis codes')
        });
        break;
      case 'icd10':
        this.api.getDiagnosis(this.page, this.pageSize, searchTrim, true, 'ICD10').subscribe({
          next: res => next(res.items, res.totalCount),
          error: e => err(e?.message || 'Failed to load diagnosis codes')
        });
        break;
      case 'modifiers':
        this.api.getModifiers(this.page, this.pageSize, searchTrim).subscribe({
          next: res => next(res.items, res.totalCount),
          error: e => err(e?.message || 'Failed to load modifiers')
        });
        break;
      case 'pos':
        this.api.getPos(this.page, this.pageSize, searchTrim).subscribe({
          next: res => next(res.items, res.totalCount),
          error: e => err(e?.message || 'Failed to load place of service')
        });
        break;
      case 'reasons':
        this.api.getReasons(this.page, this.pageSize, searchTrim).subscribe({
          next: res => next(res.items, res.totalCount),
          error: e => err(e?.message || 'Failed to load reason codes')
        });
        break;
      case 'remarks':
        this.api.getRemarks(this.page, this.pageSize, searchTrim).subscribe({
          next: res => next(res.items, res.totalCount),
          error: e => err(e?.message || 'Failed to load remark codes')
        });
        break;
    }
  }

  onSearch(): void {
    this.page = 1;
    this.selectedRow = null;
    this.loadPage();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.selectedRow = null;
    this.loadPage();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.selectedRow = null;
    this.loadPage();
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 0;
    return Math.ceil(this.totalCount / this.pageSize);
  }

  openNew(): void {
    this.editPayload = (this.activeTab === 'icd9' || this.activeTab === 'icd10')
      ? { code: '', description: '', codeType: this.activeTab === 'icd9' ? 'ICD9' : 'ICD10', isActive: true }
      : { code: '', description: '', isActive: true };
    this.showEditDialog = true;
  }

  openEdit(): void {
    if (!this.selectedRow) return;
    this.editPayload = ({ ...this.selectedRow } as unknown as CodeEditModel) || null;
    this.showEditDialog = true;
  }

  deleteSelected(): void {
    const id = this.selectedRow?.id as number | undefined;
    if (id == null) return;
    if (!confirm('Delete this row?')) return;
    const del = this.getDeleteCall(id);
    if (!del) return;
    del.subscribe({
      next: () => {
        this.selectedRow = null;
        this.loadPage();
      },
      error: e => this.error = e?.message || 'Delete failed'
    });
  }

  private getDeleteCall(id: number) {
    switch (this.activeTab) {
      case 'icd9':
      case 'icd10': return this.api.deleteDiagnosis(id);
      case 'modifiers': return this.api.deleteModifier(id);
      case 'pos': return this.api.deletePos(id);
      case 'reasons': return this.api.deleteReason(id);
      case 'remarks': return this.api.deleteRemark(id);
      default: return null;
    }
  }

  openImport(): void {
    this.showImportDialog = true;
  }

  onImportDone(): void {
    this.showImportDialog = false;
    this.loadPage();
  }

  onEditDone(): void {
    this.showEditDialog = false;
    this.editPayload = null;
    this.selectedRow = null;
    this.loadPage();
  }
}
