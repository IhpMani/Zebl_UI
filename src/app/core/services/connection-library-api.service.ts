import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ConnectionLibraryDto {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string; // Always masked as "********"
  uploadDirectory?: string;
  downloadDirectory?: string;
  downloadPattern?: string;
  autoRenameFiles: boolean;
  allowMoveOrDelete: boolean;
  autoFileExtension?: string;
  useWithInterfacesOnly: boolean;
  downloadFromSubdirectories: boolean;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateConnectionLibraryCommand {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string; // Plain text password from client
  uploadDirectory?: string;
  downloadDirectory?: string;
  downloadPattern?: string;
  autoRenameFiles?: boolean;
  allowMoveOrDelete?: boolean;
  autoFileExtension?: string;
  useWithInterfacesOnly?: boolean;
  downloadFromSubdirectories?: boolean;
  isActive?: boolean;
}

export interface UpdateConnectionLibraryCommand {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string; // Optional - only sent if user wants to change password
  uploadDirectory?: string;
  downloadDirectory?: string;
  downloadPattern?: string;
  autoRenameFiles?: boolean;
  allowMoveOrDelete?: boolean;
  autoFileExtension?: string;
  useWithInterfacesOnly?: boolean;
  downloadFromSubdirectories?: boolean;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

export interface ConnectionLibrariesApiResponse {
  data: ConnectionLibraryDto[];
  meta?: any;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionLibraryApiService {
  private baseUrl = `${environment.apiUrl}/api/connections`;

  constructor(private http: HttpClient) { }

  /** API returns raw array. */
  getAll(): Observable<ConnectionLibraryDto[]> {
    return this.http.get<ConnectionLibraryDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<ApiResponse<ConnectionLibraryDto>> {
    return this.http.get<ApiResponse<ConnectionLibraryDto>>(`${this.baseUrl}/${id}`);
  }

  create(command: CreateConnectionLibraryCommand): Observable<ApiResponse<ConnectionLibraryDto>> {
    return this.http.post<ApiResponse<ConnectionLibraryDto>>(this.baseUrl, command);
  }

  update(id: string, command: UpdateConnectionLibraryCommand): Observable<ApiResponse<ConnectionLibraryDto>> {
    return this.http.put<ApiResponse<ConnectionLibraryDto>>(`${this.baseUrl}/${id}`, command);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  testConnection(id: string): Observable<ApiResponse<TestConnectionResponse>> {
    return this.http.post<ApiResponse<TestConnectionResponse>>(`${this.baseUrl}/${id}/test`, {});
  }
}
