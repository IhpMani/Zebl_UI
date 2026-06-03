import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { ClaimApiService } from '../../../core/services/claim-api.service';
import { Claim } from '../../../core/services/claim.models';

interface CacheEntry {
  claim$: Observable<Claim>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ClaimShellCacheService {
  private readonly cache = new Map<number, CacheEntry>();
  private readonly ttlMs = 30_000;

  constructor(private readonly claimApi: ClaimApiService) {}

  getClaim(claimId: number, force = false): Observable<Claim> {
    const now = Date.now();
    const hit = this.cache.get(claimId);
    if (!force && hit && hit.expiresAt > now) {
      return hit.claim$;
    }

    const claim$ = this.claimApi.getClaimById(claimId).pipe(
      shareReplay(1),
      tap({ error: () => this.cache.delete(claimId) })
    );
    this.cache.set(claimId, { claim$, expiresAt: now + this.ttlMs });
    return claim$;
  }

  invalidate(claimId: number): void {
    this.cache.delete(claimId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
