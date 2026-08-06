import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LanguageService } from '../language.service';
import { HttpOptions } from '../../types';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);
  private baseApiUrl = environment.apiUrl;

  private getHeaders(options?: HttpOptions): HttpHeaders | { [header: string]: string | string[] } {
    const acceptLanguage = this.languageService.getAcceptLanguageHeader();
    const existingHeaders = options?.headers || {};

    if (!existingHeaders) {
      return {
        'Accept-Language': acceptLanguage,
      };
    }

    if (typeof existingHeaders === 'object' && !(existingHeaders instanceof HttpHeaders)) {
      return {
        ...existingHeaders,
        'Accept-Language': acceptLanguage,
      };
    }

    return existingHeaders;
  }

  get<T>(endpointUrl: string, options?: HttpOptions): Observable<T> {
    const url = `${this.baseApiUrl}${endpointUrl}`;
    return this.http.get<T>(url, {
      ...options,
      headers: this.getHeaders(options),
      observe: 'body',
    });
  }

  post<T>(endpointUrl: string, body: any, options?: HttpOptions): Observable<T> {
    const url = `${this.baseApiUrl}${endpointUrl}`;
    return this.http.post<T>(url, body, {
      ...options,
      headers: this.getHeaders(options),
      observe: 'body',
    });
  }

  put<T>(endpointUrl: string, body: any, options?: HttpOptions): Observable<T> {
    const url = `${this.baseApiUrl}${endpointUrl}`;
    return this.http.put<T>(url, body, {
      ...options,
      headers: this.getHeaders(options),
      observe: 'body',
    });
  }

  patch<T>(endpointUrl: string, body: any, options?: HttpOptions): Observable<T> {
    const url = `${this.baseApiUrl}${endpointUrl}`;
    return this.http.patch<T>(url, body, {
      ...options,
      headers: this.getHeaders(options),
      observe: 'body',
    });
  }

  delete<T>(endpointUrl: string, options?: HttpOptions): Observable<T> {
    const url = `${this.baseApiUrl}${endpointUrl}`;
    return this.http.delete<T>(url, {
      ...options,
      headers: this.getHeaders(options),
      observe: 'body',
    });
  }
}
