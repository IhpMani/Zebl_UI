import { Component } from '@angular/core';

@Component({
  selector: 'app-app-shell',
  template: `
    <div class="app-container">
      <app-ribbon></app-ribbon>
      <div class="content-area">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styleUrls: ['./app-shell.component.css']
})
export class AppShellComponent { }

