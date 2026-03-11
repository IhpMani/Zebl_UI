import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CodeLibraryApiService, CodeLibraryRow, DiagnosisCodeDto, LibraryKey, SimpleCodeDto } from '../../core/services/code-library-api.service';

/** Re-export for components that still reference CodeLibraryTab. */
export type CodeLibraryTab = LibraryKey;

export const LIBRARY_OPTIONS: { value: LibraryKey; label: string }[] = [
  { value: 'reasons', label: 'Reason Codes' },
  { value: 'remarks', label: 'Remark Codes' },
  { value: 'icd9', label: 'Diagnosis Codes ICD-9' },
  { value: 'icd10', label: 'Diagnosis Codes ICD-10' },
  { value: 'pos', label: 'Place of Service' },
  { value: 'modifiers', label: 'Modifiers' }
];

@Component({
  selector: 'app-code-library-page',
  templateUrl: './code-library-page.component.html',
  styleUrls: ['./code-library-page.component.scss']
})
export class CodeLibraryPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('codeInput') codeInputRef!: ElementRef<HTMLInputElement>;

  libraryKey: LibraryKey = 'reasons';
  libraryOptions = LIBRARY_OPTIONS;

  code = '';
  description = '';

  rowData: CodeLibraryRow[] = [];
  selectedRow: CodeLibraryRow | null = null;
  loading = false;
  error: string | null = null;
  saving = false;

  showImportDialog = false;
  focusCodeAfterSave = false;

  /** Data rows only (excludes "Add new entry..." row). */
  get dataRows(): CodeLibraryRow[] {
    return this.rowData.length <= 1 ? [] : this.rowData.slice(1);
  }

  get canSave(): boolean {
    return (this.code?.trim() ?? '') !== '';
  }

  get canDelete(): boolean {
    return this.selectedRow != null && this.selectedRow.id != null;
  }

  constructor(
    private api: CodeLibraryApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGrid();
  }

  ngAfterViewChecked(): void {
    if (this.focusCodeAfterSave && this.codeInputRef?.nativeElement) {
      this.focusCodeAfterSave = false;
      this.codeInputRef.nativeElement.focus();
    }
  }

  trackByRow = (_: number, row: CodeLibraryRow) => String(row.id ?? row.procID ?? row.code ?? '');

  isSelected(row: CodeLibraryRow): boolean {
    if (!this.selectedRow) return false;
    const a = String(this.selectedRow.id ?? this.selectedRow.procID ?? this.selectedRow.code ?? '');
    const b = String(row.id ?? row.procID ?? row.code ?? '');
    return a !== '' && a === b;
  }

  onLibraryChange(tab: CodeLibraryTab): void {
    this.libraryKey = tab;
    this.code = '';
    this.description = '';
    this.selectedRow = null;
    this.loadGrid();
  }

  loadGrid(): void {
    this.loading = true;
    this.error = null;
    this.api.loadLibraryCodes(this.libraryKey).subscribe({
      next: rows => {
        this.rowData = [{ code: '', description: 'Add new entry...' }, ...rows];
        this.loading = false;
      },
      error: err => {
        this.error = err?.message || 'Failed to load library';
        this.rowData = [{ code: '', description: 'Add new entry...' }];
        this.loading = false;
      }
    });
  }

  onAddNewClick(): void {
    this.code = '';
    this.description = '';
    this.selectedRow = null;
    this.focusCodeAfterSave = true;
  }

  onRowClick(row: CodeLibraryRow): void {
    this.selectedRow = row.id == null ? null : row;
    this.code = row.code ?? '';
    this.description = row.description ?? '';
  }

  saveAndNew(): void {
    if (!this.canSave) return;
    this.saveCurrent().subscribe({
      next: () => {
        this.code = '';
        this.description = '';
        this.selectedRow = null;
        this.focusCodeAfterSave = true;
        this.loadGrid();
      },
      error: err => this.error = err?.message || 'Save failed'
    });
  }

  saveAndClose(): void {
    if (!this.canSave) {
      this.close();
      return;
    }
    this.saveCurrent().subscribe({
      next: () => this.close(),
      error: err => this.error = err?.message || 'Save failed'
    });
  }

  close(): void {
    this.router.navigate(['/']);
  }

  openImport(): void {
    this.showImportDialog = true;
  }

  onImportDone(): void {
    this.showImportDialog = false;
    this.loadGrid();
  }

  deleteSelected(): void {
    if (!this.canDelete || this.selectedRow?.id == null) return;
    if (!confirm('Delete this code?')) return;
    const id = this.selectedRow.id;
    const del = this.getDeleteCall(id);
    if (!del) return;
    del.subscribe({
      next: () => {
        this.code = '';
        this.description = '';
        this.selectedRow = null;
        this.loadGrid();
      },
      error: err => this.error = err?.message || 'Delete failed'
    });
  }

  private saveCurrent(): Observable<unknown> {
    const codeTrim = (this.code ?? '').trim();
    const descTrim = (this.description ?? '').trim() || undefined;
    this.saving = true;
    this.error = null;

    const done = () => { this.saving = false; };

    if (this.selectedRow?.id != null) {
      const id = this.selectedRow.id;
      switch (this.libraryKey) {
        case 'icd9':
        case 'icd10':
          return this.api.updateDiagnosis(id, {
            id,
            code: codeTrim,
            description: descTrim,
            codeType: this.libraryKey === 'icd9' ? 'ICD9' : 'ICD10',
            isActive: true,
            createdAt: '',
            updatedAt: ''
          } as DiagnosisCodeDto).pipe(tap({ next: done, error: done }));
        case 'modifiers':
          return this.api.updateModifier(id, { id, code: codeTrim, description: descTrim, isActive: true, createdAt: '', updatedAt: '' } as SimpleCodeDto).pipe(tap({ next: done, error: done }));
        case 'pos':
          return this.api.updatePos(id, { id, code: codeTrim, description: descTrim, isActive: true, createdAt: '', updatedAt: '' } as SimpleCodeDto).pipe(tap({ next: done, error: done }));
        case 'reasons':
          return this.api.updateReason(id, { id, code: codeTrim, description: descTrim, isActive: true, createdAt: '', updatedAt: '' } as SimpleCodeDto).pipe(tap({ next: done, error: done }));
        case 'remarks':
          return this.api.updateRemark(id, { id, code: codeTrim, description: descTrim, isActive: true, createdAt: '', updatedAt: '' } as SimpleCodeDto).pipe(tap({ next: done, error: done }));
        default:
          done();
          return of(null);
      }
    }

    switch (this.libraryKey) {
      case 'icd9':
      case 'icd10':
        return this.api.createDiagnosis({
          code: codeTrim,
          description: descTrim,
          codeType: this.libraryKey === 'icd9' ? 'ICD9' : 'ICD10',
          isActive: true
        }).pipe(tap({ next: done, error: done }));
      case 'modifiers':
        return this.api.createModifier({ code: codeTrim, description: descTrim, isActive: true }).pipe(tap({ next: done, error: done }));
      case 'pos':
        return this.api.createPos({ code: codeTrim, description: descTrim, isActive: true }).pipe(tap({ next: done, error: done }));
      case 'reasons':
        return this.api.createReason({ code: codeTrim, description: descTrim, isActive: true }).pipe(tap({ next: done, error: done }));
      case 'remarks':
        return this.api.createRemark({ code: codeTrim, description: descTrim, isActive: true }).pipe(tap({ next: done, error: done }));
      default:
        done();
        return of(null);
    }
  }

  private getDeleteCall(id: number): Observable<unknown> | null {
    switch (this.libraryKey) {
      case 'icd9':
      case 'icd10': return this.api.deleteDiagnosis(id);
      case 'modifiers': return this.api.deleteModifier(id);
      case 'pos': return this.api.deletePos(id);
      case 'reasons': return this.api.deleteReason(id);
      case 'remarks': return this.api.deleteRemark(id);
      default: return null;
    }
  }
}
