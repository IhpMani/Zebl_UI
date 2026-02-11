import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-app-shell',
  template: `
    <div class="app-container">
      <div class="topbar">
        <div class="spacer"></div>
        <div class="user-menu" *ngIf="auth.isLoggedIn()">
          <div class="profile-icon" (click)="toggleMenu()">
            {{ getInitials() }}
          </div>
          <div class="dropdown" *ngIf="showMenu">
            <div class="menu-item username-display">
              {{ (auth.userName$ | async) || '' }}
            </div>
            <div class="menu-item divider" *ngIf="auth.getIsAdmin()"></div>
            <div class="menu-item" *ngIf="auth.getIsAdmin()" (click)="goToUserManagement()">User Management</div>
            <div class="menu-item divider"></div>
            <div class="menu-item" (click)="resetPassword()">Reset Password</div>
            <div class="menu-item" (click)="logout()">Logout</div>
          </div>
        </div>
      </div>
      <app-ribbon (reviewIncoming)="onReviewIncoming()"></app-ribbon>
      <div class="content-area">
        <app-interface-data-review *ngIf="showInterfaceDataReview"></app-interface-data-review>
        <router-outlet *ngIf="!showInterfaceDataReview"></router-outlet>
      </div>
    </div>
  `,
  styleUrls: ['./app-shell.component.css']
})
export class AppShellComponent {
  showMenu = false;
  showInterfaceDataReview = false;

  constructor(public auth: AuthService, private router: Router) {}

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  onReviewIncoming(): void {
    this.showInterfaceDataReview = true;
  }

  getInitials(): string {
    const userName = this.auth.getUserName();
    if (!userName) return '?';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.showMenu = false;
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  goToUserManagement(): void {
    this.showMenu = false;
    this.router.navigateByUrl('/admin/users');
  }

  resetPassword(): void {
    this.showMenu = false;
    // TODO: Navigate to reset password page or open modal
    alert('Reset Password feature - to be implemented');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.showMenu = false;
    }
  }
}

