import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProgramSettingsApiService {
  private baseUrl = `${environment.apiUrl}/api/program-settings`;

  constructor(private http: HttpClient) { }

  getSection(section: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${encodeURIComponent(section)}`);
  }

  saveSection(section: string, settings: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${encodeURIComponent(section)}`, settings);
  }

  getSendingClaimsSettings(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/settings/sending-claims`);
  }

  saveSendingClaimsSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/settings/sending-claims`, settings);
  }
}

