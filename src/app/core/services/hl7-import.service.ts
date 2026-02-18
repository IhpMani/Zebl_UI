import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Hl7ImportResponse {
  success: boolean;
  fileName: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
}

// Response used for pre-import review/analyze (existing backend logic).
export interface Hl7ReviewResponse {
  fileName: string;
  interfaceName: string;
  newPatientsCount: number;
  updatedPatientsCount: number;
  duplicatePatientsCount: number;
  newClaimsCount: number;
  totalAmount: number;
}

// History rows for Interface Data Review - from Interface_Import_Log.
export interface Hl7ImportHistoryRow {
  importId: number;
  fileName: string;
  importDate: string;
  userName: string;
  computerName: string;
  newPatientsCount: number;
  updatedPatientsCount: number;
  newClaimsCount: number;
  duplicateClaimsCount: number;
  totalAmount: number;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class Hl7ImportService {
  // In dev, /api is proxied to ASP.NET Core; in prod, apiUrl can be set to server URL.
  private baseUrl = `${environment.apiUrl}/api/hl7`;

  constructor(private http: HttpClient) { }

  /**
   * Calls existing HL7 review/analyze endpoint BEFORE commit.
   * NOTE: This assumes the backend exposes /api/hl7/review.
   */
  reviewHl7File(file: File): Observable<Hl7ReviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Hl7ReviewResponse>(`${this.baseUrl}/review`, formData);
  }

  /**
   * Imports an HL7 DFT file using the existing backend endpoint /api/hl7/import.
   */
  importHl7File(file: File): Observable<Hl7ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Hl7ImportResponse>(`${this.baseUrl}/import`, formData);
  }

  /**
   * Gets import history from DB via interface history endpoint.
   * Reads directly from SQL table.
   */
  getImportHistory(): Observable<Hl7ImportHistoryRow[]> {
    return this.http.get<Hl7ImportHistoryRow[]>(`${environment.apiUrl}/api/interface/history`);
  }
}
