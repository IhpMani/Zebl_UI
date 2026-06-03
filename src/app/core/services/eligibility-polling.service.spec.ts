import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { EligibilityApiService, EligibilityStatusDto } from './eligibility-api.service';
import { EligibilityPollingService } from './eligibility-polling.service';

describe('EligibilityPollingService', () => {
  let service: EligibilityPollingService;
  let api: jasmine.SpyObj<EligibilityApiService>;

  const baseStatus = (lifecycle: string, legacy = lifecycle): EligibilityStatusDto =>
    ({
      id: 1,
      patientId: 10,
      payerId: 20,
      subscriberId: 'SUB',
      controlNumber: 'CTRL',
      status: legacy,
      lifecycleStatus: lifecycle,
      createdAt: new Date().toISOString()
    }) as EligibilityStatusDto;

  beforeEach(() => {
    api = jasmine.createSpyObj('EligibilityApiService', ['getById']);
    TestBed.configureTestingModule({
      providers: [
        EligibilityPollingService,
        { provide: EligibilityApiService, useValue: api }
      ]
    });
    service = TestBed.inject(EligibilityPollingService);
  });

  it('emits terminal Completed status and completes', done => {
    api.getById.and.returnValues(
      of(baseStatus('Queued')),
      of(baseStatus('Awaiting271', 'Sent')),
      of(baseStatus('Completed'))
    );

    const cancel$ = new Subject<void>();
    service.pollUntilTerminal(1, { intervalMs: 1, timeoutMs: 5000 }, cancel$).subscribe({
      next: status => {
        expect(status.lifecycleStatus).toBe('Completed');
        done();
      },
      error: done.fail
    });
  });

  it('treats TimedOut lifecycle as terminal', done => {
    api.getById.and.returnValues(of(baseStatus('Queued')), of(baseStatus('TimedOut', 'Failed')));

    const cancel$ = new Subject<void>();
    service.pollUntilTerminal(1, { intervalMs: 1, timeoutMs: 5000 }, cancel$).subscribe({
      next: status => {
        expect(status.lifecycleStatus).toBe('TimedOut');
        done();
      },
      error: done.fail
    });
  });

  it('pollWithUpdates emits intermediate lifecycle updates', done => {
    const emissions: string[] = [];
    api.getById.and.returnValues(
      of(baseStatus('Queued')),
      of(baseStatus('Uploading')),
      of(baseStatus('Completed'))
    );

    const cancel$ = new Subject<void>();
    service.pollWithUpdates(1, { intervalMs: 1, timeoutMs: 5000 }, cancel$).subscribe({
      next: status => emissions.push(status.lifecycleStatus ?? status.status),
      complete: () => {
        expect(emissions).toEqual(['Queued', 'Uploading', 'Completed']);
        done();
      },
      error: done.fail
    });
  });

  it('errors on timeout', done => {
    api.getById.and.returnValue(of(baseStatus('Awaiting271', 'Sent')));

    const cancel$ = new Subject<void>();
    service
      .pollUntilTerminal(1, { intervalMs: 5, timeoutMs: 20 }, cancel$)
      .subscribe({
        next: () => done.fail('should not emit terminal'),
        error: err => {
          expect(err.message).toBe('ELIGIBILITY_POLL_TIMEOUT');
          done();
        }
      });
  });
});
