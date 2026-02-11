import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

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
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error ?? 'Login failed';
      }
    });
  }
}

