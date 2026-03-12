import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClaimTemplate {
  id?: number;
  templateName: string;
  availableToPatientId: number | null;
  billingProviderId: number | null;
  renderingProviderId: number | null;
  serviceFacilityId: number | null;
  referringProviderId: number | null;
  orderingProviderId: number | null;
  supervisingProviderId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClaimTemplateApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/claim-templates`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ClaimTemplate[]> {
    return this.http.get<ClaimTemplate[]>(this.baseUrl);
  }

  getById(id: number): Observable<ClaimTemplate> {
    return this.http.get<ClaimTemplate>(`${this.baseUrl}/${id}`);
  }

  create(template: ClaimTemplate): Observable<ClaimTemplate> {
    return this.http.post<ClaimTemplate>(this.baseUrl, template);
  }

  update(template: ClaimTemplate): Observable<void> {
    if (!template.id) {
      throw new Error('Template id is required for update.');
    }
    return this.http.put<void>(`${this.baseUrl}/${template.id}`, template);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

