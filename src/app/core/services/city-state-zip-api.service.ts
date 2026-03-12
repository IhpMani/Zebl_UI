import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface CityStateZipRow {
  id: number;
  city: string;
  state: string;
  zip: string;
  isActive: boolean;
}

export interface CityStateZipPagedResponse {
  items: CityStateZipRow[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class CityStateZipApiService {
  private baseUrl = `${environment.apiUrl}/api/city-state-zip`;

  constructor(private http: HttpClient) {}

  get(page: number, pageSize: number, filters?: { search?: string; state?: string }): Observable<CityStateZipPagedResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.state) {
      params = params.set('state', filters.state);
    }

    return this.http.get<CityStateZipPagedResponse>(this.baseUrl, { params });
  }

  bulkSave(rows: Partial<CityStateZipRow>[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk-save`, { rows });
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk-delete`, { ids });
  }
}

