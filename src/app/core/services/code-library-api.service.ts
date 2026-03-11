import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

const BASE = `${environment.apiUrl}/api/code-library`;

export interface CodeLibraryItem {
  code: string;
  description?: string;
}

export interface DiagnosisCodeDto {
  id: number;
  code: string;
  description?: string;
  codeType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SimpleCodeDto {
  id: number;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
}

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
}

export type CodeLibraryType = 'procedures' | 'diagnosis' | 'modifiers' | 'pos' | 'reasons' | 'remarks';
export type LookupType = 'diagnosis' | 'modifier' | 'pos' | 'procedure';

/** Library option for dropdown: value is API segment or icd9/icd10 for diagnosis. */
export type LibraryKey = 'reasons' | 'remarks' | 'icd9' | 'icd10' | 'pos' | 'modifiers' | 'procedures';

/** Grid row: normalized code + description + id for non-procedure. */
export interface CodeLibraryRow {
  id?: number;
  procID?: number;
  code: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CodeLibraryApiService {
  constructor(private http: HttpClient) {}

  getProcedures(page = 1, pageSize = 50, search?: string): Observable<PagedResponse<unknown>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResponse<unknown>>(`${BASE}/procedures`, { params });
  }

  getDiagnosis(page = 1, pageSize = 50, search?: string, activeOnly = true, codeType?: string): Observable<PagedResponse<DiagnosisCodeDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('activeOnly', activeOnly);
    if (search?.trim()) params = params.set('search', search.trim());
    if (codeType) params = params.set('codeType', codeType);
    return this.http.get<PagedResponse<DiagnosisCodeDto>>(`${BASE}/diagnosis`, { params });
  }

  getModifiers(page = 1, pageSize = 50, search?: string, activeOnly = true): Observable<PagedResponse<SimpleCodeDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('activeOnly', activeOnly);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResponse<SimpleCodeDto>>(`${BASE}/modifiers`, { params });
  }

  getPos(page = 1, pageSize = 50, search?: string, activeOnly = true): Observable<PagedResponse<SimpleCodeDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('activeOnly', activeOnly);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResponse<SimpleCodeDto>>(`${BASE}/pos`, { params });
  }

  getReasons(page = 1, pageSize = 50, search?: string, activeOnly = true): Observable<PagedResponse<SimpleCodeDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('activeOnly', activeOnly);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResponse<SimpleCodeDto>>(`${BASE}/reasons`, { params });
  }

  getRemarks(page = 1, pageSize = 50, search?: string, activeOnly = true): Observable<PagedResponse<SimpleCodeDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('activeOnly', activeOnly);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResponse<SimpleCodeDto>>(`${BASE}/remarks`, { params });
  }

  lookup(type: LookupType, keyword: string): Observable<CodeLibraryItem[]> {
    const params = new HttpParams().set('type', type).set('q', keyword || '');
    return this.http.get<CodeLibraryItem[]>(`${BASE}/lookup`, { params });
  }

  import(type: string, file: File): Observable<ImportResult> {
    const form = new FormData();
    form.append('type', type);
    form.append('file', file);
    return this.http.post<ImportResult>(`${BASE}/import`, form);
  }

  getDiagnosisById(id: number): Observable<DiagnosisCodeDto> {
    return this.http.get<DiagnosisCodeDto>(`${BASE}/diagnosis/${id}`);
  }

  createDiagnosis(dto: Partial<DiagnosisCodeDto>): Observable<DiagnosisCodeDto> {
    return this.http.post<DiagnosisCodeDto>(`${BASE}/diagnosis`, dto);
  }

  updateDiagnosis(id: number, dto: DiagnosisCodeDto): Observable<void> {
    return this.http.put<void>(`${BASE}/diagnosis/${id}`, dto);
  }

  deleteDiagnosis(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/diagnosis/${id}`);
  }

  getModifierById(id: number): Observable<SimpleCodeDto> {
    return this.http.get<SimpleCodeDto>(`${BASE}/modifiers/${id}`);
  }

  createModifier(dto: Partial<SimpleCodeDto>): Observable<SimpleCodeDto> {
    return this.http.post<SimpleCodeDto>(`${BASE}/modifiers`, dto);
  }

  updateModifier(id: number, dto: SimpleCodeDto): Observable<void> {
    return this.http.put<void>(`${BASE}/modifiers/${id}`, dto);
  }

  deleteModifier(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/modifiers/${id}`);
  }

  getPosById(id: number): Observable<SimpleCodeDto> {
    return this.http.get<SimpleCodeDto>(`${BASE}/pos/${id}`);
  }

  createPos(dto: Partial<SimpleCodeDto>): Observable<SimpleCodeDto> {
    return this.http.post<SimpleCodeDto>(`${BASE}/pos`, dto);
  }

  updatePos(id: number, dto: SimpleCodeDto): Observable<void> {
    return this.http.put<void>(`${BASE}/pos/${id}`, dto);
  }

  deletePos(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/pos/${id}`);
  }

  getReasonById(id: number): Observable<SimpleCodeDto> {
    return this.http.get<SimpleCodeDto>(`${BASE}/reasons/${id}`);
  }

  createReason(dto: Partial<SimpleCodeDto>): Observable<SimpleCodeDto> {
    return this.http.post<SimpleCodeDto>(`${BASE}/reasons`, dto);
  }

  updateReason(id: number, dto: SimpleCodeDto): Observable<void> {
    return this.http.put<void>(`${BASE}/reasons/${id}`, dto);
  }

  deleteReason(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/reasons/${id}`);
  }

  getRemarkById(id: number): Observable<SimpleCodeDto> {
    return this.http.get<SimpleCodeDto>(`${BASE}/remarks/${id}`);
  }

  /** Load all codes for a library (high pageSize for grid). Returns normalized rows. */
  loadLibraryCodes(libraryKey: LibraryKey, pageSize = 2000): Observable<CodeLibraryRow[]> {
    const page = 1;
    switch (libraryKey) {
      case 'procedures':
        return this.http.get<PagedResponse<{ procID: number; procCode: string; procDescription?: string }>>(`${BASE}/procedures`, {
          params: new HttpParams().set('page', page).set('pageSize', pageSize)
        }).pipe(
          map(res => (res.items || []).map(r => ({ procID: r.procID, code: r.procCode, description: r.procDescription })))
        );
      case 'icd9':
        return this.getDiagnosis(page, pageSize, undefined, true, 'ICD9').pipe(
          map(res => (res.items || []).map(r => ({ id: r.id, code: r.code, description: r.description })))
        );
      case 'icd10':
        return this.getDiagnosis(page, pageSize, undefined, true, 'ICD10').pipe(
          map(res => (res.items || []).map(r => ({ id: r.id, code: r.code, description: r.description })))
        );
      case 'modifiers':
        return this.getModifiers(page, pageSize).pipe(
          map(res => (res.items || []).map(r => ({ id: r.id, code: r.code, description: r.description })))
        );
      case 'pos':
        return this.getPos(page, pageSize).pipe(
          map(res => (res.items || []).map(r => ({ id: r.id, code: r.code, description: r.description })))
        );
      case 'reasons':
        return this.getReasons(page, pageSize).pipe(
          map(res => (res.items || []).map(r => ({ id: r.id, code: r.code, description: r.description })))
        );
      case 'remarks':
        return this.getRemarks(page, pageSize).pipe(
          map(res => (res.items || []).map(r => ({ id: r.id, code: r.code, description: r.description })))
        );
      default:
        return of([]);
    }
  }

  /** Import type string for API (diagnosis, modifier, pos, reason, remark). */
  getImportTypeForLibrary(libraryKey: LibraryKey): string | null {
    switch (libraryKey) {
      case 'icd9':
      case 'icd10': return 'diagnosis';
      case 'modifiers': return 'modifier';
      case 'pos': return 'pos';
      case 'reasons': return 'reason';
      case 'remarks': return 'remark';
      default: return null;
    }
  }

  createRemark(dto: Partial<SimpleCodeDto>): Observable<SimpleCodeDto> {
    return this.http.post<SimpleCodeDto>(`${BASE}/remarks`, dto);
  }

  updateRemark(id: number, dto: SimpleCodeDto): Observable<void> {
    return this.http.put<void>(`${BASE}/remarks/${id}`, dto);
  }

  deleteRemark(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/remarks/${id}`);
  }
}
