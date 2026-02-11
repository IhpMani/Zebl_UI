import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  userGuid: string;
  userName: string;
  isAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'zebl.jwt';

  private readonly userNameSubject = new BehaviorSubject<string | null>(this.getUserNameFromToken());
  private readonly isAdminSubject = new BehaviorSubject<boolean>(this.getIsAdminFromToken());

  userName$ = this.userNameSubject.asObservable();
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(userName: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { userName, password }).pipe(
      tap((res) => {
        this.setToken(res.token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userNameSubject.next(null);
    this.isAdminSubject.next(false);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserName(): string | null {
    return this.userNameSubject.value;
  }

  getIsAdmin(): boolean {
    return this.isAdminSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.userNameSubject.next(this.getUserNameFromToken());
    this.isAdminSubject.next(this.getIsAdminFromToken());
  }

  private getUserNameFromToken(): string | null {
    const payload = this.getJwtPayload();
    return payload?.UserName ?? payload?.unique_name ?? null;
  }

  private getIsAdminFromToken(): boolean {
    const payload = this.getJwtPayload();
    const v = payload?.IsAdmin;
    return v === true || v === 'true';
  }

  private getJwtPayload(): any | null {
    const token = this.getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const json = atob(this.base64UrlToBase64(parts[1]));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private base64UrlToBase64(input: string): string {
    return input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  }
}

