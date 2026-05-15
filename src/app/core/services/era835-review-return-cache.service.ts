import { Injectable } from '@angular/core';
import { Era835ReviewResponseDto } from './edi-reports-api.service';

/** In-memory payload so returning from claim details does not refetch GET /review. */
@Injectable({ providedIn: 'root' })
export class Era835ReviewReturnCacheService {
  private readonly payloads = new Map<string, Era835ReviewResponseDto>();

  stashForClaimNavigation(reportId: string, data: Era835ReviewResponseDto): void {
    if (!reportId || !data) return;
    this.payloads.set(reportId, JSON.parse(JSON.stringify(data)) as Era835ReviewResponseDto);
  }

  /** Returns cached review payload for this report and removes it (one-shot restore). */
  consumePayload(reportId: string): Era835ReviewResponseDto | null {
    if (!reportId) return null;
    const p = this.payloads.get(reportId) ?? null;
    if (p) this.payloads.delete(reportId);
    return p;
  }

  invalidate(reportId: string): void {
    if (reportId) this.payloads.delete(reportId);
  }
}
