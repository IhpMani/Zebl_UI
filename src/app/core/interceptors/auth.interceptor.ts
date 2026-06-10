import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpErrorMessageService } from '../services/http-error-message.service';
import { ContextResetService } from '../services/context-reset.service';
import { environment } from 'src/environments/environment';
import { friendlyApiErrorMessage } from '../utils/api-error-message.util';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private router: Router,
    private httpErrors: HttpErrorMessageService,
    private contextReset: ContextResetService
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
          if (err?.status === 428) {
            this.contextReset.clearAllClientCaches();
            this.httpErrors.show('Context changed or missing. Please re-select your facility.');
            void this.router.navigateByUrl('/dashboard');
            return;
          }
          if (err?.status === 400) {
            const msg = friendlyApiErrorMessage(err, '');
            if (msg) {
              this.httpErrors.show(msg);
            }
          }
        },
      })
    );
  }
}
