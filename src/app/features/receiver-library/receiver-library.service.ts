import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReceiverLibraryApiService, ReceiverLibraryDto, CreateReceiverLibraryCommand, UpdateReceiverLibraryCommand, ExportFormatOption, ApiResponse } from '../../core/services/receiver-library-api.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiverLibraryService {
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
