import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ListTypeConfigDto {
  listTypeName: string;
  description: string;
  /** Target table when saving (e.g. Claim, Patient) */
  targetTable?: string;
  /** Target column this list populates (e.g. ClaClassification, PatClassification) */
  targetColumn?: string;
}

export interface ListValueDto {
  value: string;
  usageCount: number;
}

export interface AddListValueRequest {
  listType: string;
  value: string;
}

export interface ListTypesResponse {
  success: boolean;
  data: ListTypeConfigDto[];
}

export interface ListValuesResponse {
  success: boolean;
  data: ListValueDto[];
}

export interface AddValueResponse {
  success: boolean;
  data: ListValueDto;
}

@Injectable({
  providedIn: 'root'
})
export class ListApiService {
  private baseUrl = `${environment.apiUrl}/api/lists`;
  private listValuesCache = new Map<string, Observable<ListValuesResponse>>();

  constructor(private http: HttpClient) { }

  getListTypes(): Observable<ListTypesResponse> {
    return this.http.get<ListTypesResponse>(`${this.baseUrl}/types`);
  }

  getListValues(listType: string): Observable<ListValuesResponse> {
    const key = (listType || '').trim().toLowerCase();
    const cached = this.listValuesCache.get(key);
    if (cached) return cached;

    const req$ = this.http.get<ListValuesResponse>(`${this.baseUrl}/values`, {
      params: { type: listType }
    }).pipe(shareReplay(1));

    this.listValuesCache.set(key, req$);
    return req$;
  }

  addListValue(request: AddListValueRequest): Observable<AddValueResponse> {
    return this.http.post<AddValueResponse>(`${this.baseUrl}/values`, request);
  }

  deleteListValue(listType: string, value: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/values`, {
      params: { type: listType, value: value }
    });
  }
}
