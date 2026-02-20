import { Component, OnInit } from '@angular/core';
import { UsersApiService, UserListItemDto } from '../../core/services/users-api.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: UserListItemDto[] = [];
  loading = false;
  error: string | null = null;

  newUserName = '';
  newPassword = '';
  newEmail = '';

  constructor(private usersApi: UsersApiService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.error = null;
    this.usersApi.getUsers().subscribe({
      next: (u) => {
        this.users = Array.isArray(u) ? u : [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = this.getErrorMessage(err, 'Failed to load users');
      }
    });
  }

  create(): void {
    this.error = null;
    this.usersApi
      .createUser({
        userName: this.newUserName,
        password: this.newPassword,
        email: this.newEmail || null
      })
      .subscribe({
        next: () => {
          this.newUserName = '';
          this.newPassword = '';
          this.newEmail = '';
          this.refresh();
        },
        error: (err) => {
          this.error = this.getErrorMessage(err, 'Failed to create user');
        }
      });
  }

  toggleActive(u: UserListItemDto): void {
    const req = u.isActive ? this.usersApi.deactivate(u.userGuid) : this.usersApi.activate(u.userGuid);
    req.subscribe({
      next: () => this.refresh(),
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Failed to update user');
      }
    });
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (err?.status === 403) {
      return 'Access denied. Admin rights required.';
    }
    const body = err?.error;
    if (body && typeof body === 'object') {
      return (body.error ?? body.message ?? body.Message) || fallback;
    }
    if (typeof body === 'string') return body;
    return err?.message || fallback;
  }
}

