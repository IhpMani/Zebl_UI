import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ClaimStatusDto {
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClaimStatusApiService {
  private baseUrl = `${environment.apiUrl}/api/claim-status`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<ClaimStatusDto[]> {
    return this.http.get<ClaimStatusDto[]>(this.baseUrl);
  }
}

