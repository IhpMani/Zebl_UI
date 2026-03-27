import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface CustomFieldDefinitionDto {
  id: number;
  entityType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomFieldRequest {
  entityType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  sortOrder: number;
}

export interface UpdateCustomFieldRequest {
  label?: string;
  fieldType?: string;
  sortOrder?: number;
}

export interface SaveCustomFieldValueRequest {
  entityType: string;
  entityId: number;
  fieldKey: string;
  value: string | null;
}

export const CUSTOM_FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXT-LIST', label: 'Text (list with history)' },
  { value: 'CURRENCY', label: 'Currency' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Time' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'YESNO', label: 'Yes/No' }
] as const;

@Injectable({
  providedIn: 'root'
})
export class CustomFieldsApiService {
  private baseUrl = `${environment.apiUrl}/api/custom-fields`;
  private definitionsCache = new Map<string, Observable<CustomFieldDefinitionDto[]>>();

  constructor(private http: HttpClient) {}

  getByEntityType(entityType: string): Observable<CustomFieldDefinitionDto[]> {
    const normalized = this.normalizeEntityType(entityType);
    const key = normalized.toLowerCase();
    const cached = this.definitionsCache.get(key);
    if (cached) return cached;
    const req$ = this.http.get<CustomFieldDefinitionDto[]>(`${this.baseUrl}/${encodeURIComponent(normalized)}`).pipe(shareReplay(1));
    this.definitionsCache.set(key, req$);
    return req$;
  }

  create(request: CreateCustomFieldRequest): Observable<CustomFieldDefinitionDto> {
    return this.http.post<CustomFieldDefinitionDto>(this.baseUrl, request);
  }

  update(id: number, request: UpdateCustomFieldRequest): Observable<CustomFieldDefinitionDto> {
    return this.http.put<CustomFieldDefinitionDto>(`${this.baseUrl}/${id}`, request);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  saveValue(request: SaveCustomFieldValueRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/value`, request);
  }

  getValues(entityType: string, entityId: number): Observable<Record<string, string>> {
    const normalized = this.normalizeEntityType(entityType);
    return this.http.get<Record<string, string>>(
      `${this.baseUrl}/values/${encodeURIComponent(normalized)}/${entityId}`
    );
  }

  private normalizeEntityType(value: string): string {
    const v = (value || '').trim().toLowerCase();
    if (v === 'patient') return 'Patient';
    if (v === 'claim') return 'Claim';
    if (v === 'serviceline') return 'ServiceLine';
    return value;
  }
}
