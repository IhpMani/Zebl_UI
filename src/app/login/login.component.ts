import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../core/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  userName = '';
  password = '';
  error: string | null = null;
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.error = null;
    this.loading = true;
    this.auth.login(this.userName, this.password).subscribe({
      next: () => {
        this.loading = false;
        if (this.auth.isSuperAdmin()) {
          void this.router.navigateByUrl('/super-admin');
        } else {
          void this.router.navigateByUrl('/');
        }
      },
      error: (err: HttpErrorResponse | unknown) => {
        this.loading = false;
        const http = err as HttpErrorResponse;
        const status = http?.status;
        const isNetworkError =
          status === 0 ||
          (typeof http?.message === 'string' &&
            /failed to fetch|networkerror|load failed|net::/i.test(http.message));
        if (isNetworkError) {
          this.error =
            `Cannot reach the API at ${environment.apiUrl}. Start Zebl.Api (HTTPS profile, port 7183), ` +
            'then in a terminal run: dotnet dev-certs https --trust (Windows/macOS). ' +
            'If you use HTTP only, set apiUrl in environment.ts to http://localhost:5226 and restart ng serve.';
          return;
        }
        const body = http?.error as { error?: string; message?: string } | string | null | undefined;
        const msg =
          (typeof body === 'object' && body != null && typeof body.error === 'string' && body.error) ||
          (typeof body === 'object' && body != null && typeof body.message === 'string' && body.message) ||
          (typeof body === 'string' ? body : null);
        this.error = msg ?? 'Login failed';
      }
    });
  }
}
