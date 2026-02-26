import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ReceiverLibraryApiService, ReceiverLibraryDto, CreateReceiverLibraryCommand, UpdateReceiverLibraryCommand, ExportFormatOption, ApiResponse } from '../../core/services/receiver-library-api.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiverLibraryService {
  /** Emits when the list should refresh (e.g. after Save and New). */
  private listRefresh$ = new Subject<void>();

  get onListRefresh(): Observable<void> {
    return this.listRefresh$.asObservable();
  }

  /** Call after create/update/delete so the list can reload. */
  notifyListRefresh(): void {
    this.listRefresh$.next();
  }

  constructor(private apiService: ReceiverLibraryApiService) {}

  getAll(): Observable<ReceiverLibraryDto[]> {
    return new Observable(observer => {
      this.apiService.getAll().subscribe({
        next: (response) => {
          observer.next(response.data || []);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  getById(id: string): Observable<ReceiverLibraryDto> {
    return new Observable(observer => {
      this.apiService.getById(id).subscribe({
        next: (response) => {
          observer.next(response.data);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  create(data: CreateReceiverLibraryCommand): Observable<ReceiverLibraryDto> {
    return new Observable(observer => {
      this.apiService.create(data).subscribe({
        next: (response) => {
          observer.next(response.data);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  update(id: string, data: UpdateReceiverLibraryCommand): Observable<ReceiverLibraryDto> {
    return new Observable(observer => {
      this.apiService.update(id, data).subscribe({
        next: (response) => {
          observer.next(response.data);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  delete(id: string): Observable<void> {
    return this.apiService.delete(id);
  }

  getExportFormats(): Observable<{ value: string; name: string }[]> {
    return new Observable(observer => {
      this.apiService.getExportFormats().subscribe({
        next: (response) => {
          observer.next(response.data || []);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }
}
