import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, CellValueChangedEvent, GridApi } from 'ag-grid-community';
import type { RowSelectionOptions } from 'ag-grid-community';
import { ProcedureCodesApiService, ProcedureCode } from '../core/services/procedure-codes-api.service';
import { PayerApiService } from '../core/services/payer-api.service';
import { AddColumnHeaderComponent } from './add-column-header.component';
import { ColumnChooserItem } from './column-chooser-dialog.component';
import { Subject, takeUntil } from 'rxjs';
import { WorkspaceService } from '../workspace/application/workspace.service';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-procedure-codes-page',
  templateUrl: './procedure-codes-page.component.html',
  styleUrls: ['./procedure-codes-page.component.scss']
})
export class ProcedureCodesPageComponent implements OnInit, OnDestroy {
  @ViewChild(AgGridAngular) grid!: AgGridAngular;

  rowData: ProcedureCode[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = PAGE_SIZE;
  loading = false;
  error: string | null = null;
  quickFilter = '';
  filterCode = '';
  filterCategory = '';
  filterSubCategory = '';
  showColumnChooser = false;
  modifiedRows = new Set<ProcedureCode>();
  saving = false;

  /** Payer dropdown: `None` → null, then each payer id (no empty-string values). */
  payerOptions: { id: number | null; name: string }[] = [{ id: null, name: 'None' }];

  gridComponents = {
    addColumnHeader: AddColumnHeaderComponent
  };

  private gridApi?: GridApi;
  private destroy$ = new Subject<void>();

  rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true,
    enableClickSelection: false
  };

  columnDefs: ColDef<ProcedureCode>[];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    editable: false
  };

  constructor(
    private api: ProcedureCodesApiService,
    private workspace: WorkspaceService,
    private payerApi: PayerApiService
  ) {
    this.columnDefs = this.buildColumnDefs();
  }

  ngOnInit(): void {
    this.workspace.updateActiveTabTitle('Procedure Codes');
    this.loadPayerOptions();
    this.loadPage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getRowId = (params: { data: ProcedureCode }) => String(params.data?.procID ?? params.data);

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<ProcedureCode>): void {
    if (event.data) {
      this.modifiedRows.add(event.data);
    }
  }

  private payerLabel(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'None';
    }
    const hit = this.payerOptions.find(o => o.id === value);
    return hit?.name ?? `Payer ${value}`;
  }

  private loadPayerOptions(): void {
    this.payerApi
      .getPayers(1, 10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.payerOptions = [
            { id: null, name: 'None' },
            ...res.data.map(p => ({
              id: p.payID,
              name: (p.payName?.trim()) || `Payer ${p.payID}`
            }))
          ];
          this.gridApi?.refreshCells({ columns: ['procPayFID'], force: true });
        },
        error: () => {
          this.payerOptions = [{ id: null, name: 'None' }];
        }
      });
  }

  private buildPayerColumnDef(): ColDef<ProcedureCode> {
    return {
      colId: 'procPayFID',
      field: 'procPayFID',
      headerName: 'Payer',
      headerTooltip: 'Payer (None = applies to all payers)',
      editable: true,
      width: 170,
      hide: true,
      valueFormatter: p => this.payerLabel(p.value),
      filterValueGetter: p => this.payerLabel(p.data?.procPayFID),
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: () => ({
        values: this.payerOptions.map(o => o.id),
        formatValue: (value: number | null) => this.payerLabel(value)
      })
    };
  }

  private buildColumnDefs(): ColDef<ProcedureCode>[] {
    return [
      {
        headerName: 'Add Column',
        colId: 'addColumn',
        pinned: 'left',
        width: 100,
        minWidth: 90,
        maxWidth: 120,
        suppressMovable: true,
        sortable: false,
        filter: false,
        headerComponent: AddColumnHeaderComponent,
        headerComponentParams: {
          openColumnChooser: () => this.openColumnChooser()
        },
        cellRenderer: () => '',
        suppressHeaderMenuButton: true
      },
      { field: 'procCode', headerName: 'Procedure', headerTooltip: 'Procedure Code', editable: true, width: 100, hide: false },
      { field: 'procModifier1', headerName: 'Mod 1', editable: true, width: 70, hide: true },
      { field: 'procModifier2', headerName: 'Mod 2', editable: true, width: 70, hide: true },
      { field: 'procModifier3', headerName: 'Mod 3', editable: true, width: 70, hide: true },
      { field: 'procModifier4', headerName: 'Mod 4', editable: true, width: 70, hide: true },
      { field: 'procCharge', headerName: 'Charge', editable: true, width: 90, type: 'numericColumn', hide: false },
      { field: 'procAllowed', headerName: 'Allowed', editable: true, width: 90, type: 'numericColumn', hide: true },
      { field: 'procAdjust', headerName: 'Adjust', editable: true, width: 90, type: 'numericColumn', hide: true },
      { field: 'procCost', headerName: 'Cost', editable: true, width: 90, type: 'numericColumn', hide: true },
      { field: 'procUnits', headerName: 'Units', editable: true, width: 75, type: 'numericColumn', hide: false },
      { field: 'procDrugUnitCount', headerName: 'Drug Unit Count', headerTooltip: 'Drug Unit Count', editable: true, width: 110, hide: true },
      { field: 'procDrugUnitMeasurement', headerName: 'Drug Unit', headerTooltip: 'Drug Unit Measurement', editable: true, width: 90, hide: true },
      { field: 'procNDCCode', headerName: 'NDC Code', editable: true, width: 100, hide: true },
      { field: 'procCategory', headerName: 'Category', editable: true, width: 100, hide: true },
      { field: 'procSubCategory', headerName: 'Subcategory', editable: true, width: 100, hide: true },
      { field: 'procRevenueCode', headerName: 'Rev', headerTooltip: 'Revenue Code', editable: true, width: 75, hide: true },
      { field: 'procProductCode', headerName: 'Product', editable: true, width: 90, hide: true },
      { field: 'procBillingPhyFID', headerName: 'Billing Phy', headerTooltip: 'Billing Physician', editable: true, width: 95, type: 'numericColumn', hide: true },
      this.buildPayerColumnDef(),
      { field: 'procRateClass', headerName: 'Rate Class', editable: true, width: 95, hide: true },
      { field: 'procRVUWork', headerName: 'Work RVU', editable: true, width: 90, type: 'numericColumn', hide: true },
      { field: 'procRVUMalpractice', headerName: 'Malpractice RVU', editable: true, width: 115, type: 'numericColumn', hide: true },
      { field: 'procStart', headerName: 'Start', editable: true, width: 95, hide: true },
      { field: 'procEnd', headerName: 'End', editable: true, width: 95, hide: true },
      { field: 'procNote', headerName: 'Note', editable: true, width: 120, hide: true },
      { field: 'procDescription', headerName: 'Description', editable: true, width: 140, hide: true }
    ];
  }

  loadPage(): void {
    this.loading = true;
    this.error = null;
    this.api
      .getPaged(this.currentPage, this.pageSize, {
        code: this.filterCode || undefined,
        category: this.filterCategory || undefined,
        subCategory: this.filterSubCategory || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.rowData = (res.items ?? []).map(row => ({
            ...row,
            procPayFID: row.procPayFID == null ? null : row.procPayFID
          }));
          this.totalCount = res.totalCount ?? 0;
          this.loading = false;
        },
        error: err => {
          this.error = err?.message || 'Failed to load procedure codes.';
          this.loading = false;
        }
      });
  }

  onPageChange(page: number): void {
    if (this.modifiedRows.size > 0 && !confirm('You have unsaved changes. Leave anyway?')) {
      return;
    }
    this.modifiedRows.clear();
    this.currentPage = page;
    this.loadPage();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadPage();
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 0;
    return Math.ceil(this.totalCount / this.pageSize);
  }

  applyQuickFilter(): void {
    this.filterCode = this.quickFilter.trim();
    this.currentPage = 1;
    this.loadPage();
  }

  openColumnChooser(): void {
    this.showColumnChooser = true;
  }

  get hiddenColumnsForChooser(): ColumnChooserItem[] {
    const dataCols = this.columnDefs.filter(
      c => c.colId && c.colId !== 'addColumn' && c.colId !== 'checkbox'
    );
    if (!this.gridApi) {
      return dataCols
        .filter(c => c.hide === true)
        .map(c => ({ colId: c.colId!, headerName: (c.headerName as string) || c.colId! }));
    }
    const state = this.gridApi.getColumnState();
    return dataCols
      .filter(c => {
        const s = state.find(x => x.colId === c.colId);
        return s?.hide === true;
      })
      .map(c => ({ colId: c.colId!, headerName: (c.headerName as string) || c.colId! }));
  }

  onShowColumn(colId: string): void {
    if (!this.gridApi) return;
    const state = this.gridApi.getColumnState();
    const updated = state.map(s => (s.colId === colId ? { ...s, hide: false } : s));
    this.gridApi.applyColumnState({ state: updated });
  }

  onColumnChooserClearAll(): void {
    if (!this.gridApi) return;
    const state = this.gridApi.getColumnState();
    const dataColIds = this.columnDefs
      .filter(c => c.colId && c.colId !== 'addColumn' && c.colId !== 'checkbox')
      .map(c => c.colId!);
    const updated = state.map(s =>
      dataColIds.includes(s.colId!) ? { ...s, hide: true } : s
    );
    this.gridApi.applyColumnState({ state: updated });
  }

  onColumnChooserOk(): void {
    this.showColumnChooser = false;
  }

  saveChanges(): void {
    const toSave = Array.from(this.modifiedRows);
    if (toSave.length === 0) return;
    this.saving = true;
    this.api
      .bulkSave(toSave)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.modifiedRows.clear();
          this.saving = false;
          this.loadPage();
        },
        error: err => {
          this.error = err?.message || 'Failed to save.';
          this.saving = false;
        }
      });
  }
}
