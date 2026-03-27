import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/** Frontend model matching API Procedure_Code (camelCase from API). */
export interface ProcedureCode {
  procID: number;
  procDateTimeCreated?: string;
  procDateTimeModified?: string;
  procCreatedUserGUID?: string;
  procLastUserGUID?: string;
  procCreatedUserName?: string;
  procLastUserName?: string;
  procCreatedComputerName?: string;
  procLastComputerName?: string;
  procAdjust: number;
  procAllowed: number;
  procBillingPhyFID: number;
  procCategory?: string;
  procCharge: number;
  procCost: number;
  procCMNReq?: boolean;
  procCode: string;
  procCoPayReq?: boolean;
  procDescription?: string;
  procDescriptionReq?: boolean;
  procDrugUnitCount: number;
  procDrugUnitMeasurement?: string;
  procModifier1?: string;
  procModifier2?: string;
  procModifier3?: string;
  procModifier4?: string;
  procNote?: string;
  procNDCCode?: string;
  /** Null = not restricted to a payer (applies to all). */
  procPayFID: number | null;
  procProductCode?: string;
  procRateClass?: string;
  procRevenueCode?: string;
  procRVUMalpractice: number;
  procRVUWork: number;
  procSubCategory?: string;
  procUnits: number;
  procStart?: string;
  procEnd?: string;
  procModifiersCC?: string;
}

export interface ProcedureCodesPagedResponse {
  items: ProcedureCode[];
  totalCount: number;
}

export interface ProcedureCodeLookupResponse {
  procedureCode: ProcedureCode | null;
  overwriteCharge: boolean;
  overwriteAllowed: boolean;
  overwriteAdjustment: boolean;
  nocDescription?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProcedureCodesApiService {
  private baseUrl = `${environment.apiUrl}/api/procedure-codes`;

  constructor(private http: HttpClient) {}

  getPaged(
    page: number = 1,
    pageSize: number = 50,
    filters?: { code?: string; category?: string; subCategory?: string }
  ): Observable<ProcedureCodesPagedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (filters?.code?.trim()) {
      params = params.set('code', filters.code.trim());
    }
    if (filters?.category?.trim()) {
      params = params.set('category', filters.category.trim());
    }
    if (filters?.subCategory?.trim()) {
      params = params.set('subCategory', filters.subCategory.trim());
    }
    return this.http.get<ProcedureCodesPagedResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ProcedureCode> {
    return this.http.get<ProcedureCode>(`${this.baseUrl}/id/${id}`);
  }

  getByCode(code: string): Observable<ProcedureCode | null> {
    const trimmed = (code || '').trim();
    if (!trimmed) return new Observable<null>((observer) => { observer.next(null); observer.complete(); });
    return this.http.get<ProcedureCode>(`${this.baseUrl}/${encodeURIComponent(trimmed)}`);
  }

  create(body: ProcedureCode): Observable<ProcedureCode> {
    return this.http.post<ProcedureCode>(this.baseUrl, body);
  }

  update(id: number, body: ProcedureCode): Observable<ProcedureCode> {
    return this.http.put<ProcedureCode>(`${this.baseUrl}/${id}`, body);
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  lookup(
    procedureCode: string,
    payerId?: number | null,
    billingPhysicianId?: number | null,
    rateClass?: string | null,
    serviceDate?: string | null,
    productCode?: string | null
  ): Observable<ProcedureCodeLookupResponse> {
    let params = new HttpParams().set('procedureCode', procedureCode);
    if (payerId != null) params = params.set('payerId', String(payerId));
    if (billingPhysicianId != null) params = params.set('billingPhysicianId', String(billingPhysicianId));
    if (rateClass) params = params.set('rateClass', rateClass);
    if (serviceDate) params = params.set('serviceDate', serviceDate);
    if (productCode) params = params.set('productCode', productCode);
    return this.http.get<ProcedureCodeLookupResponse>(`${this.baseUrl}/lookup`, { params });
  }

  /**
   * POST raw payload as JSON array to bulk-save.
   * Backend expects a raw array body (not { rows: [...] }).
   */
  bulkSaveRaw(payload: unknown[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/bulk-save`, payload);
  }

  /**
   * Convenience helper: map camelCase rows to PascalCase EF shape.
   * Backend endpoint expects EF entity property names.
   */
  bulkSave(items: ProcedureCode[]): Observable<{ success: boolean }> {
    const payload = (items ?? []).map(r => ({
      ProcID: r.procID ?? 0,
      ProcCode: r.procCode,
      ProcCharge: r.procCharge ?? 0,
      ProcAllowed: r.procAllowed ?? 0,
      ProcAdjust: r.procAdjust ?? 0,
      ProcUnits: r.procUnits ?? 1,
      ProcDescription: r.procDescription ?? null,
      ProcPayFID: r.procPayFID ?? null,
      ProcBillingPhyFID: r.procBillingPhyFID ?? 0,
      ProcCategory: r.procCategory ?? null,
      ProcSubCategory: r.procSubCategory ?? null,
      ProcCost: r.procCost ?? 0,
      ProcCMNReq: r.procCMNReq ?? false,
      ProcCoPayReq: r.procCoPayReq ?? false,
      ProcDescriptionReq: r.procDescriptionReq ?? false,
      ProcDrugUnitCount: r.procDrugUnitCount ?? 0,
      ProcDrugUnitMeasurement: r.procDrugUnitMeasurement ?? null,
      ProcModifier1: r.procModifier1 ?? null,
      ProcModifier2: r.procModifier2 ?? null,
      ProcModifier3: r.procModifier3 ?? null,
      ProcModifier4: r.procModifier4 ?? null,
      ProcNote: r.procNote ?? null,
      ProcNDCCode: r.procNDCCode ?? null,
      ProcProductCode: r.procProductCode ?? null,
      ProcRateClass: r.procRateClass ?? null,
      ProcRevenueCode: r.procRevenueCode ?? null,
      ProcRVUMalpractice: r.procRVUMalpractice ?? 0,
      ProcRVUWork: r.procRVUWork ?? 0,
      ProcStart: r.procStart ?? null,
      ProcEnd: r.procEnd ?? null,
      ProcModifiersCC: r.procModifiersCC ?? ''
    }));

    return this.bulkSaveRaw(payload);
  }
}
