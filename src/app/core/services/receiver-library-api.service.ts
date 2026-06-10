import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ReceiverLibraryDto {
  id: string;
  libraryEntryName: string;
  exportFormat: string;
  claimType?: string;
  submitterType: number;
  businessOrLastName?: string;
  firstName?: string;
  submitterId?: string;
  contactName?: string;
  contactType?: string;
  contactValue?: string;
  receiverName?: string;
  receiverId?: string;
  // ISA01-ISA04
  authorizationInfoQualifier?: string; // ISA01
  authorizationInfo?: string; // ISA02
  securityInfoQualifier?: string; // ISA03
  securityInfo?: string; // ISA04
  // ISA05-ISA08
  senderQualifier?: string; // ISA05
  senderId?: string; // ISA06
  receiverQualifier?: string; // ISA07
  interchangeReceiverId?: string; // ISA08
  acknowledgeRequested: boolean;
  testProdIndicator?: string;
  senderCode?: string;
  receiverCode?: string;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateReceiverLibraryCommand {
  libraryEntryName: string;
  exportFormat: string;
  claimType?: string;
  submitterType?: number;
  businessOrLastName?: string;
  firstName?: string;
  submitterId?: string;
  contactName?: string;
  contactType?: string;
  contactValue?: string;
  receiverName?: string;
  receiverId?: string; // Receiver Information (Loop 1000B)
  // ISA01-ISA04
  authorizationInfoQualifier?: string; // ISA01
  authorizationInfo?: string; // ISA02
  securityInfoQualifier?: string; // ISA03
  securityInfo?: string; // ISA04
  // ISA05-ISA08
  senderQualifier?: string; // ISA05
  senderId?: string; // ISA06
  receiverQualifier?: string; // ISA07
  interchangeReceiverId?: string; // ISA08
  acknowledgeRequested?: boolean;
  testProdIndicator?: string;
  senderCode?: string;
  receiverCode?: string;
  isActive?: boolean;
}

export interface UpdateReceiverLibraryCommand extends CreateReceiverLibraryCommand {
}

export interface ExportFormatOption {
  value: string;
  name: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

export interface ReceiverLibrariesApiResponse {
  data: ReceiverLibraryDto[];
  meta?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReceiverLibraryApiService {
  private baseUrl = `${environment.apiUrl}/api/receiver-library`;

  constructor(private http: HttpClient) { }

  getAll(type?: 'eligibility'): Observable<ReceiverLibrariesApiResponse> {
    if (type) {
      return this.http.get<ReceiverLibrariesApiResponse>(`${this.baseUrl}?type=${encodeURIComponent(type)}`);
    }
    return this.http.get<ReceiverLibrariesApiResponse>(this.baseUrl);
  }

  getById(id: string): Observable<ApiResponse<ReceiverLibraryDto>> {
    return this.http.get<ApiResponse<ReceiverLibraryDto>>(`${this.baseUrl}/${id}`);
  }

  create(command: CreateReceiverLibraryCommand): Observable<ApiResponse<ReceiverLibraryDto>> {
    return this.http.post<ApiResponse<ReceiverLibraryDto>>(this.baseUrl, this.normalizeIsaPayload(command));
  }

  update(id: string, command: UpdateReceiverLibraryCommand): Observable<ApiResponse<ReceiverLibraryDto>> {
    return this.http.put<ApiResponse<ReceiverLibraryDto>>(`${this.baseUrl}/${id}`, this.normalizeIsaPayload(command));
  }

  /** X12 ISA element limits — truncate before API so legacy backends never 400 on long portal passwords. */
  private normalizeIsaPayload<T extends CreateReceiverLibraryCommand>(command: T): T {
    const qualifier = (command.securityInfoQualifier ?? '00').trim();
    const payload = { ...command };
    payload.authorizationInfoQualifier = clampIsa(command.authorizationInfoQualifier, 2) || '00';
    payload.authorizationInfo = clampIsa(command.authorizationInfo, 10);
    payload.securityInfoQualifier = clampIsa(qualifier, 2) || '00';
    payload.securityInfo =
      payload.securityInfoQualifier === '00' ? '' : clampIsa(command.securityInfo, 10);
    payload.senderQualifier = clampIsa(command.senderQualifier, 2) || '01';
    payload.senderId = clampIsa(command.senderId, 15);
    payload.receiverQualifier = clampIsa(command.receiverQualifier, 2) || '01';
    payload.interchangeReceiverId = clampIsa(command.interchangeReceiverId, 15);
    payload.testProdIndicator = clampIsa(command.testProdIndicator, 1) || command.testProdIndicator;
    return payload;
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getExportFormats(): Observable<ApiResponse<ExportFormatOption[]>> {
    return this.http.get<ApiResponse<ExportFormatOption[]>>(`${this.baseUrl}/export-formats`);
  }
}

function clampIsa(value: string | undefined | null, maxLen: number): string {
  const text = (value ?? '').toString().trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}
