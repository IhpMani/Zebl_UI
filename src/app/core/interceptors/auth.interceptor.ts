import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpErrorMessageService } from '../services/http-error-message.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private router: Router,
    private httpErrors: HttpErrorMessageService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    const isLoginRequest = req.url.includes('/api/auth/login');
    const isApiRequest =
      (req.url.includes('/api/') ||
        (!!environment.apiUrl && req.url.startsWith(environment.apiUrl))) &&
      !isLoginRequest;
    if (token && isApiRequest) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }

    return next.handle(req).pipe(
      tap({
        error: (err) => {
          if (err?.status === 401) {
            this.auth.logout();
            void this.router.navigateByUrl('/login');
            return;
          }
          if (err?.status === 403) {
            void this.router.navigateByUrl('/unauthorized');
            return;
          }
          if (err?.status === 400) {
            const body = err?.error as Record<string, unknown> | string | null | undefined;
            const msg =
              (typeof body === 'object' && body != null
                ? (typeof body['message'] === 'string' ? body['message'] : null) ??
                  (typeof body['Message'] === 'string' ? body['Message'] : null) ??
                  (typeof body['error'] === 'string' ? body['error'] : null)
                : null) ??
              (typeof body === 'string' ? body : null);
            if (typeof msg === 'string' && msg.length > 0) {
              this.httpErrors.show(msg);
            }
          }
        },
      })
    );
  }
}
