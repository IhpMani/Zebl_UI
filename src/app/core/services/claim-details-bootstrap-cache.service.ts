import { Injectable } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CustomFieldsApiService } from './custom-fields-api.service';
import { ListApiService } from './list-api.service';
import { PayerApiService } from './payer-api.service';
import { PhysicianApiService } from './physician-api.service';

@Injectable({
  providedIn: 'root'
})
export class ClaimDetailsBootstrapCacheService {
  private initialized = false;

  constructor(
    private customFieldsApi: CustomFieldsApiService,
    private listApi: ListApiService,
    private payerApi: PayerApiService,
    private physicianApi: PhysicianApiService
  ) {}

  /** Allow preload to run again (e.g. after switching facility). */
  reset(): void {
    this.initialized = false;
  }

  preload(): void {
    if (this.initialized) return;
    this.initialized = true;

    forkJoin({
      claimCustomFields: this.customFieldsApi.getByEntityType('Claim'),
      serviceLineCustomFields: this.customFieldsApi.getByEntityType('ServiceLine'),
      claimClassification: this.listApi.getListValues('Claim Classification'),
      payers: this.payerApi.getPayers(1, 10000),
      physicians: this.physicianApi.getPhysicians(1, 10000)
    }).subscribe({
      next: () => {},
      error: () => {
        // Keep app startup resilient; page-level calls can still retry.
        this.initialized = false;
      }
    });
  }
}
