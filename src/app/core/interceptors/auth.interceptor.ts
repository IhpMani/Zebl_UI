import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    // Attach Bearer token to all API requests except login (relative /api/... or absolute .../api/...)
    const isLoginRequest = req.url.includes('/api/auth/login');
    const isApiRequest = (req.url.includes('/api/') ||
      (environment.apiUrl && req.url.startsWith(environment.apiUrl))) && !isLoginRequest;
    if (token && isApiRequest) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(req).pipe(
      tap({
        error: (err) => {
          if (err?.status === 401) {
            this.auth.logout();
            this.router.navigateByUrl('/login');
          }
        }
      })
    );
  }
}

