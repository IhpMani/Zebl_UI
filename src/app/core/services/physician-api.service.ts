import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhysiciansApiResponse } from './physician.models';

@Injectable({
  providedIn: 'root'
})
export class PhysicianApiService {
  private baseUrl = '/api/physicians';

  constructor(private http: HttpClient) { }

  getPhysicians(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      searchText?: string;
      inactive?: boolean;
      type?: string;
      fromDate?: Date;
      toDate?: Date;
      minPhysicianId?: number;
      maxPhysicianId?: number;
      additionalColumns?: string[];
    }
  ): Observable<PhysiciansApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
      if (filters.searchText) {
        params = params.append('searchText', filters.searchText);
      }
      if (filters.inactive !== undefined) {
        params = params.append('inactive', filters.inactive.toString());
      }
      if (filters.type) {
        params = params.append('type', filters.type);
      }
      if (filters.fromDate) {
        params = params.append('fromDate', filters.fromDate.toISOString());
      }
      if (filters.toDate) {
        params = params.append('toDate', filters.toDate.toISOString());
      }
      if (filters.minPhysicianId !== undefined) {
        params = params.append('minPhysicianId', filters.minPhysicianId.toString());
      }
      if (filters.maxPhysicianId !== undefined) {
        params = params.append('maxPhysicianId', filters.maxPhysicianId.toString());
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<PhysiciansApiResponse>(this.baseUrl, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }
}
