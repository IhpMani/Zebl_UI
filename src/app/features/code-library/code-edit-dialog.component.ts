import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CodeLibraryApiService, DiagnosisCodeDto, SimpleCodeDto } from '../../core/services/code-library-api.service';
import { CodeLibraryTab } from './code-library-page.component';

/** Edit form model used in template (dot notation) and save. */
export interface CodeEditModel {
  id?: number;
  code: string;
  description?: string;
  codeType?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-code-edit-dialog',
  templateUrl: './code-edit-dialog.component.html',
  styleUrls: ['./code-edit-dialog.component.scss']
})
export class CodeEditDialogComponent {
  @Input() activeTab!: CodeLibraryTab;
  @Input() payload!: CodeEditModel;
  @Output() close = new EventEmitter<void>();

  saving = false;
  error: string | null = null;

  constructor(private api: CodeLibraryApiService) {}

  get isNew(): boolean {
    const p = this.payload;
    return p?.id == null || p.id === 0;
  }

  get model(): CodeEditModel {
    return this.payload || { code: '', description: '', isActive: true };
  }

  save(): void {
    this.saving = true;
    this.error = null;
    const m = this.model;
    const id = m.id ?? 0;

    const next = () => {
      this.saving = false;
      this.close.emit();
    };
    const err = (e: { message?: string }) => {
      this.error = e?.message || 'Save failed';
      this.saving = false;
    };

    const code = String(m.code ?? '').trim();
    const description = m.description ?? '';
    const isActive = m.isActive ?? true;

    switch (this.activeTab) {
      case 'icd9':
      case 'icd10':
        if (this.isNew) {
          this.api.createDiagnosis({
            code,
            description,
            codeType: this.activeTab === 'icd9' ? 'ICD9' : 'ICD10',
            isActive
          }).subscribe({ next, error: err });
        } else {
          this.api.updateDiagnosis(id, {
            id,
            code,
            description,
            codeType: m.codeType ?? 'ICD10',
            isActive,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt
          } as DiagnosisCodeDto).subscribe({ next, error: err });
        }
        break;
      case 'modifiers':
        if (this.isNew) {
          this.api.createModifier({ code, description, isActive }).subscribe({ next, error: err });
        } else {
          this.api.updateModifier(id, this.payload as SimpleCodeDto).subscribe({ next, error: err });
        }
        break;
      case 'pos':
        if (this.isNew) {
          this.api.createPos({ code, description, isActive }).subscribe({ next, error: err });
        } else {
          this.api.updatePos(id, this.payload as SimpleCodeDto).subscribe({ next, error: err });
        }
        break;
      case 'reasons':
        if (this.isNew) {
          this.api.createReason({ code, description, isActive }).subscribe({ next, error: err });
        } else {
          this.api.updateReason(id, this.payload as SimpleCodeDto).subscribe({ next, error: err });
        }
        break;
      case 'remarks':
        if (this.isNew) {
          this.api.createRemark({ code, description, isActive }).subscribe({ next, error: err });
        } else {
          this.api.updateRemark(id, this.payload as SimpleCodeDto).subscribe({ next, error: err });
        }
        break;
      default:
        this.saving = false;
    }
  }

  closeDialog(): void {
    this.close.emit();
  }
}
