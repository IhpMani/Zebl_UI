import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    if (!token) return next.handle(req);

    // Avoid attaching auth header to non-API calls if any (safe default).
    const apiUrl = `${environment.apiUrl}/api/`;
    if (!req.url.startsWith(apiUrl) && !req.url.startsWith('/api/')) return next.handle(req);

    return next.handle(
      req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    );
  }
}

