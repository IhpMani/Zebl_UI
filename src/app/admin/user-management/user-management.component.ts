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
        this.users = u;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error ?? 'Failed to load users';
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
          this.error = err?.error?.error ?? 'Failed to create user';
        }
      });
  }

  toggleActive(u: UserListItemDto): void {
    const req = u.isActive ? this.usersApi.deactivate(u.userGuid) : this.usersApi.activate(u.userGuid);
    req.subscribe({
      next: () => this.refresh(),
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to update user';
      }
    });
  }
}

