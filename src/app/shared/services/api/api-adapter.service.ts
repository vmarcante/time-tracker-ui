import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { Observable, Subscription, forkJoin } from 'rxjs';
import {
  ApiErrorResponse,
  ForkJoinRequestOptions,
  RequestOptions,
  ApiResponse,
  ApiTypedResponse,
} from '../../types';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from '../toastr.service';
import { TranslationService } from '../translation.service';

type ApiTypedTuple<T extends readonly unknown[]> = { [K in keyof T]: ApiTypedResponse<T[K]> };

const ERROR_TOAST_DEDUPE_MS = 3000;
const PUBLIC_URL_PREFIX = '/public/';
const REFRESH_URL_PATH = '/public/auth/refresh';

@Injectable({
  providedIn: 'root',
})
export class ApiAdapterService {
  private destroyRef = inject(DestroyRef);
  private toastrService = inject(ToastrService);
  private translationService = inject(TranslationService);

  private requestsSubscriptionsMap = new Map<string, Subscription>();
  private looseSubscriptions = new Set<Subscription>();
  private recentErrorToasts = new Map<string, number>();

  isLoading = signal(false);
  customLoadings = signal<Map<string, boolean>>(new Map());

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancelAllRequests();
    });
  }

  executeRequest<T>(request: Observable<T>, options: RequestOptions<T> = {}): Subscription {
    if (!options.customLoadingName && !options.ignoreLoading) {
      this.isLoading.set(true);
    } else if (options.customLoadingName && !options.ignoreLoading) {
      this.customLoadings.update((loadings) => {
        const newLoadings = new Map(loadings);
        newLoadings.set(options.customLoadingName!, true);
        return newLoadings;
      });
    }

    // Se for especificado, cancela a subscription anterior
    if (options.subscriptionName && this.requestsSubscriptionsMap.has(options.subscriptionName)) {
      this.requestsSubscriptionsMap.get(options.subscriptionName)?.unsubscribe();
      this.requestsSubscriptionsMap.delete(options.subscriptionName);
    }

    // Cria uma nova subscription e a adiciona ao map caso tenha sido especificado a chave
    const subscription = request.subscribe({
      next: (response) => {
        if (options.onSuccess) {
          options.onSuccess(response);
        }

        if (options.customLoadingName && !options.ignoreLoading) {
          this.customLoadings.update((loadings) => {
            const newLoadings = new Map(loadings);
            newLoadings.set(options.customLoadingName!, false);
            return newLoadings;
          });
          return;
        }

        if (!options.ignoreLoading) {
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        if (options.showErrorToast ?? true) {
          this.notifyError(error, options.errorMessage);
        }

        if (options.onError) {
          options.onError(error);
        }

        if (options.customLoadingName && !options.ignoreLoading) {
          this.customLoadings.update((loadings) => {
            const newLoadings = new Map(loadings);
            newLoadings.set(options.customLoadingName!, false);
            return newLoadings;
          });
          return;
        }

        if (!options.ignoreLoading) {
          this.isLoading.set(false);
        }
      },
    });

    if (options.subscriptionName) {
      this.requestsSubscriptionsMap.set(options.subscriptionName, subscription);
    } else {
      this.looseSubscriptions.add(subscription);
    }

    return subscription;
  }

  executeForkJoinRequest<T extends readonly unknown[]>(
    requests: readonly [...{ [K in keyof T]: Observable<T[K]> }],
    options: ForkJoinRequestOptions<T> = {},
  ): Subscription {
    const forkJoinRequest = forkJoin(requests);

    return this.executeRequest<T>(forkJoinRequest, {
      ...options,
      onSuccess: (responses) => {
        if (options.onSuccessForkJoin) {
          options.onSuccessForkJoin(responses);
        }
      },
    });
  }

  executeRequestWithPromise<T>(
    request: ApiResponse<T>,
    options: RequestOptions<ApiTypedResponse<T>> = {},
  ): Promise<ApiTypedResponse<T>> {
    return new Promise((resolve, reject) => {
      this.executeRequest(request, {
        ...options,
        onSuccess: (response) => {
          if (options.onSuccess) {
            options.onSuccess(response);
          }
          resolve(response);
        },
        onError: (error) => {
          if (options.onError) {
            options.onError(error);
          }
          reject(error);
        },
      });
    });
  }

  executeForkJoinWithPromise<T extends readonly unknown[]>(
    requests: readonly [...{ [K in keyof T]: ApiResponse<T[K]> }],
    options: ForkJoinRequestOptions<ApiTypedTuple<T>> = {},
  ): Promise<ApiTypedTuple<T>> {
    return new Promise((resolve, reject) => {
      this.executeForkJoinRequest<ApiTypedTuple<T>>(requests, {
        ...options,
        onSuccessForkJoin: (responses) => {
          if (options.onSuccessForkJoin) {
            options.onSuccessForkJoin(responses);
          }
          resolve(responses);
        },
        onError: (error) => {
          if (options.onError) {
            options.onError(error);
          }
          reject(error);
        },
      });
    });
  }

  cancelRequest(subscriptionName: string): void {
    if (this.requestsSubscriptionsMap.has(subscriptionName)) {
      this.requestsSubscriptionsMap.get(subscriptionName)?.unsubscribe();
      this.requestsSubscriptionsMap.delete(subscriptionName);
    }
  }

  cancelAllRequests(): void {
    this.requestsSubscriptionsMap.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.requestsSubscriptionsMap.clear();

    this.looseSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.looseSubscriptions.clear();
  }

  getLoadingState(customLoadingName?: string): boolean {
    if (customLoadingName) {
      return this.customLoadings().get(customLoadingName) ?? false;
    }
    return this.isLoading();
  }

  private notifyError(error: ApiErrorResponse | undefined, customMessage?: string): void {
    if (this.isSessionExpiredError(error) || this.isSilentError(error)) {
      return;
    }

    const message = this.resolveErrorMessage(error, customMessage);
    if (this.isDuplicateErrorToast(message)) {
      return;
    }

    this.toastrService.errorMessage(message);
  }

  private isSilentError(error: ApiErrorResponse | undefined): boolean {
    const err = error as { data?: { key?: string }; error?: { key?: string; data?: { key?: string } } } | undefined;
    const key = err?.data?.key ?? err?.error?.data?.key ?? err?.error?.key;
    return key === 'user.onboarding.pending';
  }

  private isSessionExpiredError(error: ApiErrorResponse | undefined): boolean {
    if (error?.status !== 401) {
      return false;
    }

    const url = error.url ?? '';
    return !url.includes(PUBLIC_URL_PREFIX) || url.includes(REFRESH_URL_PATH);
  }

  private isDuplicateErrorToast(message: string): boolean {
    const now = Date.now();

    this.recentErrorToasts.forEach((shownAt, key) => {
      if (now - shownAt >= ERROR_TOAST_DEDUPE_MS) {
        this.recentErrorToasts.delete(key);
      }
    });

    if (this.recentErrorToasts.has(message)) {
      return true;
    }

    this.recentErrorToasts.set(message, now);
    return false;
  }

  private resolveErrorMessage(error: ApiErrorResponse | undefined, customMessage?: string): string {
    if (customMessage) {
      return customMessage;
    }

    const apiMessage = error?.error?.data?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    const fallbackKey = error?.status === 0 ? 'common.errors.network' : 'common.errors.generic';
    return this.translationService.translate(fallbackKey);
  }
}
