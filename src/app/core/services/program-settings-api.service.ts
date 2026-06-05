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

  getSection(section: string, scope?: 'tenant' | 'facility'): Observable<any> {
    const url = scope === 'tenant'
      ? `${this.baseUrl}/${encodeURIComponent(section)}?scope=tenant`
      : `${this.baseUrl}/${encodeURIComponent(section)}`;
    return this.http.get<any>(url);
  }

  saveSection(section: string, settings: any, scope?: 'tenant' | 'facility'): Observable<any> {
    const headers = scope === 'tenant'
      ? { 'X-Program-Settings-Scope': 'tenant' }
      : undefined;
    return this.http.put<any>(
      `${this.baseUrl}/${encodeURIComponent(section)}`,
      settings,
      headers ? { headers } : {}
    );
  }

  clearFacilityOverride(section: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${encodeURIComponent(section)}/facility-override`);
  }

  getSendingClaimsSettings(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/settings/sending-claims`);
  }

  saveSendingClaimsSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/settings/sending-claims`, settings);
  }
}

