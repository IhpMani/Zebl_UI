import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConnectionLibraryApiService,
  ConnectionLibraryDto,
  CreateConnectionLibraryCommand,
  UpdateConnectionLibraryCommand,
  ApiResponse,
  TestConnectionResponse
} from '../../core/services/connection-library-api.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectionLibraryService {
  constructor(private apiService: ConnectionLibraryApiService) {}

  getAll(): Observable<ConnectionLibraryDto[]> {
    return new Observable(observer => {
      this.apiService.getAll().subscribe({
        next: (list) => {
          observer.next(Array.isArray(list) ? list : []);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  getById(id: string): Observable<ConnectionLibraryDto> {
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

  create(data: CreateConnectionLibraryCommand): Observable<ConnectionLibraryDto> {
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

  update(id: string, data: UpdateConnectionLibraryCommand): Observable<ConnectionLibraryDto> {
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

  testConnection(id: string): Observable<TestConnectionResponse> {
    return new Observable(observer => {
      this.apiService.testConnection(id).subscribe({
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
}
