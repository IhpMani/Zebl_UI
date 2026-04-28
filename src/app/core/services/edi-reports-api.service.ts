import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EdiGenerateResponseDto {
  status: string;
  correlationId?: string;
  reportId: string;
  fileName: string;
  fileType: string;
  reportStatus: string;
  fileSize: number;
  isDuplicate: boolean;
}

export interface EdiApplyResponseDto {
  processed: number;
  applied: number;
  skipped?: number;
  duplicatesSkipped: number;
  unmatched: number;
  reversed?: number;
  invalid?: number;
  creditsCreated?: number;
  correlationId?: string;
}

export interface EdiReportDto {
  id: string;
  receiverLibraryId?: string;
  connectionLibraryId?: string;
  fileName: string;
  fileType: string;
  direction: string;
  status: string;
  traceNumber?: string;
  claimIdentifier?: string;
  payerName?: string;
  paymentAmount?: number;
  note?: string;
  createdAt: string;
  sentAt?: string;
  receivedAt?: string;
  isArchived: boolean;
  isRead: boolean;
  fileSize: number;
  correlationId?: string;
  isDuplicate?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EdiReportsApiService {
  private baseUrl = `${environment.apiUrl}/api/edi-reports`;

  constructor(private http: HttpClient) {}

  getAll(archived?: boolean): Observable<EdiReportDto[]> {
    if (archived != null) {
      return this.http.get<EdiReportDto[]>(this.baseUrl, { params: { archived: String(archived) } });
    }
    return this.http.get<EdiReportDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<EdiReportDto> {
    return this.http.get<EdiReportDto>(`${this.baseUrl}/${id}`);
  }

  getContent(id: string, preview: boolean = false): Observable<string> {
    return this.http.get(`${this.baseUrl}/${id}/content`, { 
      params: preview ? { preview: 'true' } : {},
      responseType: 'text' 
    });
  }

  generate(request: { receiverLibraryId: string; claimId: number; connectionLibraryId?: string; fileType?: string }): Observable<EdiGenerateResponseDto> {
    return this.http.post<EdiGenerateResponseDto>(`${this.baseUrl}/generate`, {
      receiverLibraryId: request.receiverLibraryId,
      claimId: request.claimId,
      connectionLibraryId: request.connectionLibraryId || null,
      fileType: request.fileType || '837'
    });
  }

  download(connectionLibraryId: string, receiverLibraryId: string): Observable<{ count: number; skippedCount?: number; message?: string; reports: EdiReportDto[] }> {
    return this.http.post<{ count: number; skippedCount?: number; message?: string; reports: EdiReportDto[] }>(`${this.baseUrl}/download`, {
      connectionLibraryId,
      receiverLibraryId
    });
  }

  archive(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/archive/${id}`, {});
  }

  markAsRead(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/mark-read/${id}`, {});
  }

  updateNote(id: string, note: string | null): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${id}/note`, { note });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  exportFile(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/export`, { responseType: 'blob' });
  }

  apply(reportId: string): Observable<EdiApplyResponseDto> {
    return this.http.post<EdiApplyResponseDto>(`${this.baseUrl}/${reportId}/apply`, {});
  }
}
