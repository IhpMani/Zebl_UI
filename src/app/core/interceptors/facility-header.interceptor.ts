import { Injectable } from '@angular/core';

import {

  HttpErrorResponse,

  HttpInterceptor,

  HttpRequest,

  HttpHandler,

  HttpEvent,

} from '@angular/common/http';

import { Observable, throwError } from 'rxjs';

import { environment } from 'src/environments/environment';

import { FacilityService } from '../services/facility.service';



@Injectable()

export class FacilityHeaderInterceptor implements HttpInterceptor {

  constructor(private facility: FacilityService) {}



  intercept(

    req: HttpRequest<unknown>,

    next: HttpHandler

  ): Observable<HttpEvent<unknown>> {

    const isApiRequest =

      req.url.includes('/api/') ||

      (!!environment.apiUrl && req.url.startsWith(environment.apiUrl));



    if (!isApiRequest) {

      return next.handle(req);

    }



    const url = req.url;



    if (this.isSuperAdminUrl(url)) {

      const headers = req.headers.delete('X-Tenant-Key').delete('X-Facility-Id');

      return next.handle(req.clone({ headers }));

    }



    if (this.isLoginUrl(url)) {

      const headers = req.headers.delete('X-Tenant-Key').delete('X-Facility-Id');

      return next.handle(req.clone({ headers }));

    }



    const tenant = this.facility.getTenantKeyOptional();

    if (tenant == null || tenant.length === 0) {

      return throwError(

        () =>

          new HttpErrorResponse({

            error: {

              message:

                'Tenant context is required. Sign in again, or ensure your account is assigned to a tenant.',

            },

            status: 428,

            statusText: 'Precondition Required',

            url: req.url,

          })

      );

    }



    if (this.operationalBootstrapNoFacility(req.method, url)) {

      const headers = req.headers

        .delete('X-Facility-Id')

        .set('X-Tenant-Key', tenant);

      return next.handle(req.clone({ headers }));

    }



    const facility = this.facility.getFacilityIdOptional();

    if (facility == null || facility <= 0) {

      return throwError(

        () =>

          new HttpErrorResponse({

            error: { message: 'Select facility' },

            status: 428,

            statusText: 'Precondition Required',

            url: req.url,

          })

      );

    }



    const run = req.headers

      .set('X-Tenant-Key', tenant)

      .set('X-Facility-Id', String(facility));

    return next.handle(req.clone({ headers: run }));

  }



  private operationalBootstrapNoFacility(method: string, url: string): boolean {

    if (!['GET', 'HEAD'].includes(method.toUpperCase())) {

      return false;

    }

    return (

      url.includes('/api/facilities') ||

      url.includes('/api/integrations/by-facility')

    );

  }



  private isSuperAdminUrl(url: string): boolean {

    const base = environment.apiUrl?.replace(/\/$/, '') ?? '';

    return (

      url.includes('/api/super-admin') ||

      (!!base && url.startsWith(`${base}/api/super-admin`))

    );

  }



  /** Login has no JWT/tenant yet; other auth paths (e.g. register) may require X-Tenant-Key. */
  private isLoginUrl(url: string): boolean {

    return url.includes('/api/auth/login');

  }

}

