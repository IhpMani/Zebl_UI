import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AdminFacilityListItem {
  facilityId: number;
  name: string;
  facilityCode?: string | null;
  isActive: boolean;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  npi?: string | null;
  taxId?: string | null;
  usersAssigned: number;
}

export interface UpsertFacilityRequest {
  name: string;
  facilityCode?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  npi?: string | null;
  taxId?: string | null;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FacilitiesAdminApiService {
  private readonly base = `${environment.apiUrl}/api/admin/facilities`;

  constructor(private http: HttpClient) {}

  list(): Observable<AdminFacilityListItem[]> {
    return this.http.get<AdminFacilityListItem[]>(this.base);
  }

  create(req: UpsertFacilityRequest): Observable<{ facilityId: number }> {
    return this.http.post<{ facilityId: number }>(this.base, req);
  }

  update(facilityId: number, req: UpsertFacilityRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${facilityId}`, req);
  }

  activate(facilityId: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${facilityId}/activate`, {});
  }

  deactivate(facilityId: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${facilityId}/deactivate`, {});
  }
}
