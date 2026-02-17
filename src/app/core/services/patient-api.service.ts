import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PatientsApiResponse, PatientDetail, UpdatePatientRequest } from './patient.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PatientApiService {
  private baseUrl = `${environment.apiUrl}/api/patients`;

  constructor(private http: HttpClient) { }

  getPatientById(patId: number): Observable<PatientDetail> {
    return this.http.get<PatientDetail>(`${this.baseUrl}/${patId}`);
  }

  updatePatient(id: number, body: UpdatePatientRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, body);
  }

  getPatients(
    page: number = 1,
    pageSize: number = 25,
    filters?: {
      searchText?: string;
      active?: boolean;
      fromDate?: Date;
      toDate?: Date;
      minPatientId?: number;
      maxPatientId?: number;
      claimId?: number;
      classificationList?: string;
      additionalColumns?: string[];
    }
  ): Observable<PatientsApiResponse> {
    let params = new HttpParams();
    params = params.append('page', page.toString());
    params = params.append('pageSize', pageSize.toString());

    if (filters) {
      if (filters.searchText) {
        params = params.append('searchText', filters.searchText);
      }
      if (filters.active !== undefined) {
        params = params.append('active', filters.active.toString());
      }
      if (filters.fromDate) {
        params = params.append('fromDate', filters.fromDate.toISOString());
      }
      if (filters.toDate) {
        params = params.append('toDate', filters.toDate.toISOString());
      }
      if (filters.minPatientId !== undefined) {
        params = params.append('minPatientId', filters.minPatientId.toString());
      }
      if (filters.maxPatientId !== undefined) {
        params = params.append('maxPatientId', filters.maxPatientId.toString());
      }
      if (filters.claimId !== undefined) {
        params = params.append('claimId', filters.claimId.toString());
      }
      if (filters.classificationList) {
        params = params.append('classificationList', filters.classificationList);
      }
      if (filters.additionalColumns && filters.additionalColumns.length > 0) {
        params = params.append('additionalColumns', filters.additionalColumns.join(','));
      }
    }

    return this.http.get<PatientsApiResponse>(this.baseUrl, { params });
  }

  getAvailableColumns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/available-columns`);
  }
}
