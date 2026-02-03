import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppShellComponent } from './app-shell/app-shell.component';
import { RibbonComponent } from './ribbon/ribbon.component';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { HomeComponent } from './home/home.component'; // New import for HomeComponent

@NgModule({
  declarations: [
    AppShellComponent,
    RibbonComponent,
    ClaimListComponent,
    HomeComponent // Declare HomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppShellComponent] // Bootstrap with AppShellComponent
})
export class AppModule { }

