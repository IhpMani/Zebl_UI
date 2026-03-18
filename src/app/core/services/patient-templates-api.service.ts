import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PatientTemplateDto {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class PatientTemplatesApiService {
  private baseUrl = `${environment.apiUrl}/api/patient-templates`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<PatientTemplateDto[]> {
    return this.http.get<PatientTemplateDto[]>(this.baseUrl);
  }
}

