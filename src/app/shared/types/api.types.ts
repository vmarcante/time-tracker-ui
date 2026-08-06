import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HttpOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?:
    | HttpParams
    | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  responseType?: 'json';
  withCredentials?: boolean;
}

export interface RequestOptions<T> {
  successMessage?: string;
  errorMessage?: string;
  customLoadingName?: string;
  subscriptionName?: string;
  ignoreLoading?: boolean;
  onSuccess?: (response: T) => void;
  onError?: (error: ApiErrorResponse) => void;
}

export interface ForkJoinRequestOptions<T extends readonly unknown[]> {
  successMessage?: string;
  errorMessage?: string;
  customLoadingName?: string;
  subscriptionName?: string;
  onSuccessForkJoin?: (responses: T) => void;
  onError?: (error: ApiErrorResponse) => void;
}

export interface ApiTypedResponse<T> {
  success: boolean;
  status: number;
  data: T;
}

export interface ApiErrorTypedResponse<T> {
  error?: T;
  headers?: HttpHeaders;
  status?: number;
  statusText?: string;
  url?: string;
  redirected?: boolean;
  responseType?: ResponseType;
}

export interface ApiErrorData {
  key?: string;
  message?: string;
}

export type ApiErrorResponse = ApiErrorTypedResponse<ApiTypedResponse<ApiErrorData>>;
export type ApiResponse<T> = Observable<ApiTypedResponse<T>>;
