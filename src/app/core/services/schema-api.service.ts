import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ColumnMetadata {
  columnName: string;
  displayName: string;
  dataType: string;
  isForeignKey: boolean;
  referenceTable: string | null;
  referenceDisplayColumn: string | null;
  isNullable: boolean;
  isSortable: boolean;
  isFilterable: boolean;
  category: string;
}

export interface EntityColumnsResponse {
  success: boolean;
  data: {
    entityName: string;
    columns: ColumnMetadata[];
  };
}

export interface EntitiesResponse {
  success: boolean;
  data: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SchemaApiService {
  private baseUrl = `${environment.apiUrl}/schema`;

  constructor(private http: HttpClient) { }

  /**
   * Get column metadata for entity using EF Core model
   * Returns business columns with FK relationships identified
   */
  getEntityColumns(entityName: string): Observable<EntityColumnsResponse> {
    return this.http.get<EntityColumnsResponse>(`${this.baseUrl}/columns`, {
      params: { table: entityName }
    });
  }

  /**
   * Get list of available entities
   */
  getAvailableEntities(): Observable<EntitiesResponse> {
    return this.http.get<EntitiesResponse>(`${this.baseUrl}/entities`);
  }
}
