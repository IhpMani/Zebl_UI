import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Hl7ImportResponse {
  success: boolean;
  fileName: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
}

@Injectable({
  providedIn: 'root'
})
export class Hl7ImportService {
  private baseUrl = '/api/hl7';

  constructor(private http: HttpClient) { }

  /**
   * Imports an HL7 DFT file
   * @param file The .hl7 file to import
   * @returns Observable with import result
   */
  importHl7File(file: File): Observable<Hl7ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<Hl7ImportResponse>(`${this.baseUrl}/import`, formData);
  }
}
