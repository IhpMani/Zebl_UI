import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, Subject, takeUntil, throwError } from 'rxjs';
import { ProcedureCodesApiService, ProcedureCode } from '../../core/services/procedure-codes-api.service';
import { PayerApiService } from '../../core/services/payer-api.service';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { ListApiService } from '../../core/services/list-api.service';
import { PayerListItem } from '../../core/services/payer.models';
import { PhysicianListItem } from '../../core/services/physician.models';
import { ModifyProcedureCodeDialogPayload } from './modify-procedure-code-dialog.component';
import { RateClassSelectorResult } from './rate-class-selector-dialog.component';

const PAGE_SIZE = 100;
const ENTRY_HINT = 'Click here to add a new procedure code library entry';

export interface ProcedureCodeRow extends ProcedureCode {
  __isNew?: boolean;
  __dirty?: boolean;
  __rowId?: string;
}

type EditorType = 'text' | 'number' | 'bool' | 'date' | 'payer' | 'physician' | 'rateClass';

@Component({
  selector: 'app-procedure-code-library-page',
  templateUrl: './procedure-code-library-page.component.html',
  styleUrls: ['./procedure-code-library-page.component.scss']
})
export class ProcedureCodeLibraryPageComponent implements OnInit, OnDestroy {
  @ViewChild('importFileInput') importFileInput?: ElementRef<HTMLInputElement>;

  entryHint = ENTRY_HINT;

  rowData: ProcedureCodeRow[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = PAGE_SIZE;
  loading = false;
  error: string | null = null;
  saving = false;

  showColumnChooser = false;
  showBulkEditDialog = false;
  showRateClassDialog = false;

  dirtyRowIds = new Set<number | string>();
  newRowIds = new Set<string>();
  selectedRowIds = new Set<number | string>();

  payerOptions: { value: number; label: string }[] = [];
  physicianOptions: { value: number; label: string }[] = [];
  rateClassOptions: string[] = [];

  bulkEditPrefill: Partial<ModifyProcedureCodeDialogPayload> | null = null;
  lastRateClassSelection: RateClassSelectorResult | null = null;

  columnFilters: Record<string, string> = {};
  columnSearchText = '';

  visibleColumnKeys: string[] = ['procCode', 'procModifier1', 'procCharge', 'procPayFID', 'procDescription'];

  allColumns: Array<{ key: keyof ProcedureCodeRow; label: string; editor: EditorType }> = [
    { key: 'procCode', label: 'Procedure', editor: 'text' },
    { key: 'procModifier1', label: 'Mod 1', editor: 'text' },
    { key: 'procCharge', label: 'Charge', editor: 'number' },
    { key: 'procPayFID', label: 'Payer', editor: 'payer' },
    { key: 'procDescription', label: 'Description', editor: 'text' },

    { key: 'procAllowed', label: 'Allowed', editor: 'number' },
    { key: 'procAdjust', label: 'Adjust', editor: 'number' },
    { key: 'procCost', label: 'Cost', editor: 'number' },
    { key: 'procUnits', label: 'Units', editor: 'number' },
    { key: 'procRevenueCode', label: 'Revenue Code', editor: 'text' },
    { key: 'procProductCode', label: 'Product', editor: 'text' },
    { key: 'procBillingPhyFID', label: 'Billing Phy', editor: 'physician' },
    { key: 'procRateClass', label: 'Rate Class', editor: 'rateClass' },
    { key: 'procStart', label: 'Start', editor: 'date' },
    { key: 'procEnd', label: 'End', editor: 'date' },
    { key: 'procRVUWork', label: 'Work RVU', editor: 'number' },
    { key: 'procRVUMalpractice', label: 'Malpractice RVU', editor: 'number' },
    { key: 'procCMNReq', label: 'Attach CMN', editor: 'bool' },
    { key: 'procCoPayReq', label: 'Set Pat Amt Due', editor: 'bool' },
    { key: 'procDescriptionReq', label: 'Set Desc', editor: 'bool' },
    { key: 'procCategory', label: 'Category', editor: 'text' },
    { key: 'procSubCategory', label: 'Subcategory', editor: 'text' },
    { key: 'procNDCCode', label: 'NDC Code', editor: 'text' },
    { key: 'procDrugUnitCount', label: 'Drug Unit Count', editor: 'number' },
    { key: 'procDrugUnitMeasurement', label: 'Drug Unit Measurement', editor: 'text' },
    { key: 'procNote', label: 'Note', editor: 'text' },
    { key: 'procModifier2', label: 'Mod 2', editor: 'text' },
    { key: 'procModifier3', label: 'Mod 3', editor: 'text' },
    { key: 'procModifier4', label: 'Mod 4', editor: 'text' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private procedureCodeApi: ProcedureCodesApiService,
    private payerApi: PayerApiService,
    private physicianApi: PhysicianApiService,
    private listApi: ListApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPayers();
    this.loadPhysicians();
    this.loadRateClasses();
    this.loadPage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get visibleColumns() {
    return this.allColumns.filter(c => this.visibleColumnKeys.includes(c.key as string));
  }

  trackByRow = (_: number, row: ProcedureCodeRow) => this.getRowKey(row);

  get filteredRows(): ProcedureCodeRow[] {
    return this.rowData.filter(r => this.matchesFilters(r));
  }

  get allVisibleChecked(): boolean {
    const rows = this.filteredRows;
    if (rows.length === 0) return false;
    return rows.every(r => this.selectedRowIds.has(this.getRowKey(r)));
  }

  get hasCheckedRows(): boolean {
    return this.selectedRowIds.size > 0;
  }

  getCellValue(row: ProcedureCodeRow, key: keyof ProcedureCodeRow): unknown {
    return (row as any)[key];
  }

  formatNumberForDisplay(value: unknown, key: string): string | number {
    if (value == null || value === '') return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    // For currency / charge, always show 2 decimals
    if (key === 'procCharge') {
      return n.toFixed(2);
    }
    return n;
  }

  setCellValue(row: ProcedureCodeRow, key: keyof ProcedureCodeRow, rawValue: unknown): void {
    const col = this.allColumns.find(c => c.key === key);
    if (!col) return;

    let value: unknown = rawValue;
    if (col.editor === 'number') {
      if (rawValue === '' || rawValue === null || rawValue === undefined) value = 0;
      else {
        const n = Number(rawValue);
        value = Number.isFinite(n) ? n : 0;
      }
    }
    (row as any)[key] = value;
    this.markDirty(row);
  }

  asDateInputValue(value: unknown): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const s = String(value);
    return s.includes('T') ? s.split('T')[0] : s.slice(0, 10);
  }

  setDateCellValue(row: ProcedureCodeRow, key: keyof ProcedureCodeRow, rawValue: unknown): void {
    const s = rawValue == null ? '' : String(rawValue);
    (row as any)[key] = s ? s : null;
    this.markDirty(row);
  }

  setBoolCellValue(row: ProcedureCodeRow, key: keyof ProcedureCodeRow, checked: boolean): void {
    (row as any)[key] = checked;
    this.markDirty(row);
  }

  private getRowKey(row: ProcedureCodeRow): number | string {
    return row.procID && row.procID !== 0 ? row.procID : (row.__rowId ?? `${row.procID}-${row.procCode}`);
  }

  isChecked(row: ProcedureCodeRow): boolean {
    return this.selectedRowIds.has(this.getRowKey(row));
  }

  toggleRowChecked(row: ProcedureCodeRow, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const key = this.getRowKey(row);
    if (checked) this.selectedRowIds.add(key);
    else this.selectedRowIds.delete(key);
  }

  toggleCheckAll(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    if (!checked) {
      for (const r of this.filteredRows) this.selectedRowIds.delete(this.getRowKey(r));
      return;
    }
    for (const r of this.filteredRows) this.selectedRowIds.add(this.getRowKey(r));
  }

  applyFilters(): void {
    // filteredRows is computed; method exists for template binding
  }

  private matchesFilters(row: ProcedureCodeRow): boolean {
    for (const col of this.visibleColumns) {
      const f = (this.columnFilters[col.key as string] ?? '').trim();
      if (!f) continue;
      const v = (row as any)[col.key];
      const s = v == null ? '' : String(v);
      if (!s.toLowerCase().includes(f.toLowerCase())) return false;
    }
    return true;
  }

  onEntryRowClick(): void {
    this.createNewProcedureRow();
  }

  private createNewProcedureRow(): void {
    const row: ProcedureCodeRow = {
      procID: 0,
      procCode: '',
      procCharge: 0,
      procAllowed: 0,
      procAdjust: 0,
      procBillingPhyFID: 0,
      procPayFID: 0,
      procUnits: 1,
      procCost: 0,
      procCMNReq: false,
      procCoPayReq: false,
      procDescriptionReq: false,
      procDrugUnitCount: 0,
      procRVUMalpractice: 0,
      procRVUWork: 0,
      procModifiersCC: '',
      __isNew: true,
      __dirty: true,
      __rowId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`
    } as ProcedureCodeRow;

    this.rowData = [row, ...this.rowData];
    if (row.__rowId) {
      this.newRowIds.add(row.__rowId);
      this.dirtyRowIds.add(row.__rowId);
    }
  }

  markDirty(row: ProcedureCodeRow): void {
    row.__dirty = true;
    const key = this.getRowKey(row);
    this.dirtyRowIds.add(key);
    if (row.__isNew && row.__rowId) this.newRowIds.add(row.__rowId);
  }

  openColumnChooser(): void {
    this.showColumnChooser = true;
  }

  onColumnChooserClose(): void {
    this.showColumnChooser = false;
  }

  hideColumn(colKey: string): void {
    this.visibleColumnKeys = this.visibleColumnKeys.filter(k => k !== colKey);
  }

  getFilteredChooserColumns(): Array<{ key: string; label: string }> {
    const search = (this.columnSearchText ?? '').trim().toLowerCase();
    const cols = this.allColumns.map(c => ({ key: c.key as string, label: c.label }));
    if (!search) return cols;
    return cols.filter(c => c.label.toLowerCase().includes(search));
  }

  isColumnVisible(colKey: string): boolean {
    return this.visibleColumnKeys.includes(colKey);
  }

  toggleColumnVisibility(colKey: string): void {
    if (this.visibleColumnKeys.includes(colKey)) {
      this.visibleColumnKeys = this.visibleColumnKeys.filter(k => k !== colKey);
    } else {
      this.visibleColumnKeys.push(colKey);
    }
  }

  clearAllColumns(): void {
    this.visibleColumnKeys = [];
  }

  loadPage(): void {
    this.loading = true;
    this.error = null;
    this.procedureCodeApi
      .getPaged(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.rowData = (res.items ?? []).map(r => ({ ...r, __dirty: false, __isNew: false } as ProcedureCodeRow));
          this.totalCount = res.totalCount ?? 0;
          this.loading = false;
          this.selectedRowIds.clear();
          this.dirtyRowIds.clear();
          this.newRowIds.clear();
        },
        error: (err) => {
          this.error = err?.message || 'Failed to load procedure codes.';
          this.loading = false;
        }
      });
  }

  loadPayers(): void {
    this.payerApi
      .getPayers(1, 5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const data = (res as { data?: PayerListItem[] }).data ?? [];
          this.payerOptions = data.map(p => ({ value: p.payID, label: (p.payName || `Payer ${p.payID}`).trim() }));
        }
      });
  }

  loadPhysicians(): void {
    this.physicianApi
      .getPhysicians(1, 5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const data = (res?.data ?? []) as PhysicianListItem[];
          this.physicianOptions = data.map(p => ({
            value: p.phyID,
            label: (p.phyFullNameCC || p.phyLastName || p.phyFirstName || `Physician ${p.phyID}`).trim()
          }));
        }
      });
  }

  loadRateClasses(): void {
    this.listApi
      .getListValues('Rate Class')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const data = res?.data ?? [];
          this.rateClassOptions = data.map((d: { value: string }) => d.value).filter(Boolean);
        }
      });
  }

  onPageChange(page: number): void {
    if (this.dirtyRowIds.size > 0 && !confirm('You have unsaved changes. Leave anyway?')) return;
    this.currentPage = page;
    this.loadPage();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadPage();
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 1;
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  saveChanges(): void {
    const toSave = this.getDirtyRows();
    const payload = this.toBulkSavePayload(toSave);
    if (payload.length === 0) return;
    this.saving = true;
    this.procedureCodeApi
      .bulkSaveRaw(payload)
      .pipe(
        catchError((err) => {
          if (err?.status === 400) {
            // Log backend validation messages to quickly diagnose payload issues
            console.error('Bulk save failed', err.error);
            if (err?.error?.errors) console.error('Bulk save model errors', err.error.errors);
          }
          return throwError(() => err);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.loadPage();
        },
        error: (err) => {
          this.error = err?.message || 'Failed to save.';
          this.saving = false;
        }
      });
  }

  saveAndClose(): void {
    const toSave = this.getDirtyRows();
    const payload = this.toBulkSavePayload(toSave);
    if (payload.length === 0) {
      this.close();
      return;
    }
    this.saving = true;
    this.procedureCodeApi
      .bulkSaveRaw(payload)
      .pipe(
        catchError((err) => {
          if (err?.status === 400) {
            console.error('Bulk save failed', err.error);
            if (err?.error?.errors) console.error('Bulk save model errors', err.error.errors);
          }
          return throwError(() => err);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/libraries']);
        },
        error: (err) => {
          this.error = err?.message || 'Failed to save.';
          this.saving = false;
        }
      });
  }

  close(): void {
    if (this.dirtyRowIds.size > 0 && !confirm('You have unsaved changes. Close anyway?')) return;
    this.router.navigate(['/libraries']);
  }

  checkAll(): void {
    for (const r of this.filteredRows) this.selectedRowIds.add(this.getRowKey(r));
  }

  uncheckAll(): void {
    for (const r of this.filteredRows) this.selectedRowIds.delete(this.getRowKey(r));
  }

  deleteChecked(): void {
    const selected = this.rowData.filter(r => this.selectedRowIds.has(this.getRowKey(r)));
    if (selected.length === 0) return;
    if (!confirm('Delete selected procedure codes?')) return;

    const toDeleteIds = selected.map(r => r.procID).filter(id => id && id > 0) as number[];
    const localNew = selected.filter(r => !r.procID || r.procID === 0);
    if (localNew.length > 0) {
      const keys = new Set(localNew.map(r => this.getRowKey(r)));
      this.rowData = this.rowData.filter(r => !keys.has(this.getRowKey(r)));
      keys.forEach(k => this.selectedRowIds.delete(k));
    }

    if (toDeleteIds.length === 0) return;
    this.loading = true;
    forkJoin(toDeleteIds.map(id => this.procedureCodeApi.delete(id)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.loadPage();
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.message || 'Failed to delete.';
        }
      });
  }

  openBulkEdit(): void {
    const selectedCount = this.rowData.filter(r => this.selectedRowIds.has(this.getRowKey(r))).length;
    if (selectedCount === 0) {
      alert('Check at least one row first.');
      return;
    }
    this.showBulkEditDialog = true;
  }

  onBulkEditCancel(): void {
    this.showBulkEditDialog = false;
  }

  onBulkEditApply(payload: ModifyProcedureCodeDialogPayload): void {
    this.applyBulkEdit(payload, false);
    this.showBulkEditDialog = false;
  }

  onBulkEditCreateNew(payload: ModifyProcedureCodeDialogPayload): void {
    this.applyBulkEdit(payload, true);
    this.showBulkEditDialog = false;
  }

  openRateClassSelector(): void {
    this.showRateClassDialog = true;
  }

  onRateClassCancel(): void {
    this.showRateClassDialog = false;
  }

  onRateClassOk(result: RateClassSelectorResult): void {
    this.lastRateClassSelection = result;
    this.bulkEditPrefill = {
      applyRateClass: true,
      rateClass: result.rateClass ?? null,
      applyBillingProvider: true,
      billingPhysicianId: result.billingPhysicianId ?? null,
      applyPayer: true,
      payerId: result.payerId ?? null
    };
    this.showRateClassDialog = false;
  }

  onBrowseProcedureFile(): void {
    // Reuse existing hidden file input used by Import command
    this.importFileInput?.nativeElement?.click();
  }

  private getDirtyRows(): ProcedureCode[] {
    return this.rowData
      .filter(r => (r.__dirty || r.__isNew) && !(r.__isNew && !r.procCode?.trim()))
      .map(r => {
        const copy = { ...r } as Record<string, unknown>;
        delete copy['__isNew'];
        delete copy['__dirty'];
        delete copy['__rowId'];
        return copy as unknown as ProcedureCode;
      });
  }

  /**
   * Backend expects a raw JSON array of EF-shaped objects (PascalCase),
   * not an object wrapper.
   *
   * Also enforce safety validation:
   * - ProcCode cannot be empty (skip those rows)
   * - ProcUnits must be >= 1
   */
  private toBulkSavePayload(rows: ProcedureCode[]): unknown[] {
    return (rows ?? [])
      .map(r => {
        const procCode = (r.procCode ?? '').trim();
        const procUnitsRaw = Number(r.procUnits ?? 1);
        const procUnits = Number.isFinite(procUnitsRaw) && procUnitsRaw >= 1 ? procUnitsRaw : 1;

        return {
          ProcID: r.procID ?? 0,
          ProcCode: procCode,
          ProcCharge: r.procCharge ?? 0,
          ProcAllowed: r.procAllowed ?? 0,
          ProcAdjust: r.procAdjust ?? 0,
          ProcUnits: procUnits,
          ProcDescription: r.procDescription ?? null,
          // Backend entity types are non-nullable ints/bools. Use 0/false defaults (not null).
          ProcPayFID: r.procPayFID ?? 0,
          ProcBillingPhyFID: r.procBillingPhyFID ?? 0,
          ProcCategory: r.procCategory ?? null,
          ProcSubCategory: r.procSubCategory ?? null,
          ProcCost: r.procCost ?? 0,
          ProcCMNReq: r.procCMNReq ?? false,
          ProcCoPayReq: r.procCoPayReq ?? false,
          ProcDescriptionReq: r.procDescriptionReq ?? false,
          ProcDrugUnitCount: r.procDrugUnitCount ?? 0,
          ProcDrugUnitMeasurement: r.procDrugUnitMeasurement ?? null,
          ProcModifier1: r.procModifier1 ?? null,
          ProcModifier2: r.procModifier2 ?? null,
          ProcModifier3: r.procModifier3 ?? null,
          ProcModifier4: r.procModifier4 ?? null,
          ProcNote: r.procNote ?? null,
          ProcNDCCode: r.procNDCCode ?? null,
          ProcProductCode: r.procProductCode ?? null,
          ProcRateClass: r.procRateClass ?? null,
          ProcRevenueCode: r.procRevenueCode ?? null,
          ProcRVUMalpractice: r.procRVUMalpractice ?? 0,
          ProcRVUWork: r.procRVUWork ?? 0,
          ProcStart: r.procStart ?? null,
          ProcEnd: r.procEnd ?? null,
          ProcModifiersCC: r.procModifiersCC ?? ''
        };
      })
      .filter(p => Boolean((p as any).ProcCode));
  }

  onImportClick(): void {
    // Open the Rate Class / Procedure File dialog when importing,
    // so user can pick the Procedure Code File first.
    this.openRateClassSelector();
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const newRows = this.parseImportedProcedureCodes(text);
      if (newRows.length === 0) return;
      this.rowData = [...newRows, ...this.rowData];
      newRows.forEach(r => {
        if (r.__rowId) {
          this.newRowIds.add(r.__rowId);
          this.dirtyRowIds.add(r.__rowId);
        }
      });
    };
    reader.readAsText(file);
    input.value = '';
  }

  private parseImportedProcedureCodes(text: string): ProcedureCodeRow[] {
    const lines = text.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.length > 0);
    const rows: ProcedureCodeRow[] = [];
    for (const line of lines) {
      const parts = line.split('\t');
      const procCode = (parts[0] ?? '').trim();
      if (!procCode) continue;

      const charge = Number(parts[1] ?? 0) || 0;
      const allowed = Number(parts[2] ?? 0) || 0;
      const adjust = Number(parts[3] ?? 0) || 0;
      const description = (parts[4] ?? '').trim();
      const productCode = (parts[5] ?? '').trim();
      const modifier = (parts[6] ?? '').trim();
      const category = (parts[7] ?? '').trim();
      const subcategory = (parts[8] ?? '').trim();
      const workRVU = Number(parts[9] ?? 0) || 0;
      const malRVU = Number(parts[10] ?? 0) || 0;

      rows.push({
        procID: 0,
        procCode,
        procCharge: charge,
        procAllowed: allowed,
        procAdjust: adjust,
        procDescription: description,
        procProductCode: productCode,
        procModifier1: modifier,
        procCategory: category,
        procSubCategory: subcategory,
        procRVUWork: workRVU,
        procRVUMalpractice: malRVU,
        procBillingPhyFID: 0,
        procPayFID: 0,
        procUnits: 1,
        procCost: 0,
        procCMNReq: false,
        procCoPayReq: false,
        procDescriptionReq: false,
        procDrugUnitCount: 0,
        procModifiersCC: '',
        __isNew: true,
        __dirty: true,
        __rowId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`
      } as ProcedureCodeRow);
    }
    return rows;
  }

  private applyBulkEdit(payload: ModifyProcedureCodeDialogPayload, createNew: boolean): void {
    const selectedRows = this.rowData.filter(r => this.selectedRowIds.has(this.getRowKey(r)));
    if (selectedRows.length === 0) return;

    const applyToRow = (row: ProcedureCodeRow) => {
      if (payload.applyCharge) row.procCharge = payload.charge ?? row.procCharge;
      if (payload.applyAllowed) row.procAllowed = payload.allowed ?? row.procAllowed;
      if (payload.applyAdjust) row.procAdjust = payload.adjust ?? row.procAdjust;
      if (payload.applyPayer) row.procPayFID = payload.payerId ?? row.procPayFID;
      if (payload.applyRateClass) row.procRateClass = payload.rateClass ?? row.procRateClass;
      if (payload.applyBillingProvider) row.procBillingPhyFID = payload.billingPhysicianId ?? row.procBillingPhyFID;
      if (payload.applyCategory) row.procCategory = payload.category ?? row.procCategory;
      if (payload.applySubcategory) row.procSubCategory = payload.subcategory ?? row.procSubCategory;
      if (payload.applyStart) row.procStart = payload.startDate ?? row.procStart;
      if (payload.applyEnd) row.procEnd = payload.endDate ?? row.procEnd;
      this.markDirty(row);
    };

    if (!createNew) {
      selectedRows.forEach(applyToRow);
      return;
    }

    const clones: ProcedureCodeRow[] = selectedRows.map(r => {
      const clone: ProcedureCodeRow = {
        ...r,
        procID: 0,
        __isNew: true,
        __dirty: true,
        __rowId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`
      };
      applyToRow(clone);
      return clone;
    });

    this.rowData = [...clones, ...this.rowData];
    clones.forEach(c => {
      if (c.__rowId) {
        this.newRowIds.add(c.__rowId);
        this.dirtyRowIds.add(c.__rowId);
      }
    });
  }
}
