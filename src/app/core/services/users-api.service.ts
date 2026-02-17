import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UserListItemDto {
  userGuid: string;
  userName: string;
  email?: string | null;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<UserListItemDto[]> {
    return this.http.get<UserListItemDto[]>(`${environment.apiUrl}/api/users`);
  }

  createUser(req: { userName: string; password: string; email?: string | null }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/users`, req);
  }

  activate(userGuid: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/users/${userGuid}/activate`, {});
  }

  deactivate(userGuid: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/users/${userGuid}/deactivate`, {});
  }
}

