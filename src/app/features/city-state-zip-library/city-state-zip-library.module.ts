import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CityStateZipLibraryRoutingModule } from './city-state-zip-library-routing.module';
import { CityStateZipLibraryPageComponent } from './city-state-zip-library-page.component';

@NgModule({
  declarations: [CityStateZipLibraryPageComponent],
  imports: [
    CommonModule,
    FormsModule,
    CityStateZipLibraryRoutingModule
  ]
})
export class CityStateZipLibraryModule {}

