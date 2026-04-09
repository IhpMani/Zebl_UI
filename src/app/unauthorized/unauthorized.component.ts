import { Component } from '@angular/core';

@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="unauth-wrap">
      <h1>Access denied</h1>
      <p>You do not have permission to view this page.</p>
      <a routerLink="/">Go to home</a>
    </div>
  `,
  styles: [
    `
      .unauth-wrap {
        padding: 2rem;
        font-family: system-ui, sans-serif;
      }
      h1 {
        margin: 0 0 0.5rem;
      }
      a {
        color: #2563eb;
      }
    `,
  ],
})
export class UnauthorizedComponent {}
