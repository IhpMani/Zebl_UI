import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class UserFacilitiesApiService {
  constructor(private http: HttpClient) {}

  getFacilityIdsForUser(userId: string): Observable<number[]> {
    return this.http.get<number[]>(`${environment.apiUrl}/api/user-facilities/${userId}`);
  }

  addMapping(userId: string, facilityId: number): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/api/user-facilities`, { userId, facilityId });
  }

  removeMapping(userId: string, facilityId: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/api/user-facilities`, {
      body: { userId, facilityId },
    });
  }
}
