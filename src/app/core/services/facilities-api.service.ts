import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface OperationalFacilityRow {
  facilityId: number;
  name: string;
  tenantId: number;
}

@Injectable({ providedIn: 'root' })
export class FacilitiesApiService {
  constructor(private http: HttpClient) {}

  /** GET /api/facilities — requires X-Tenant-Key only (operational bootstrap). */
  getMyFacilities(): Observable<OperationalFacilityRow[]> {
    return this.http.get<OperationalFacilityRow[]>(`${environment.apiUrl}/api/facilities`);
  }
}
