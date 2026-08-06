import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from './language.service';
import { SupportedLanguages } from '../types/supported-languages.type';

type TranslationData = Record<string, any>;

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);
  private commonContexts = ['common', 'layout', 'auth'];

  private translations = signal<Record<SupportedLanguages, TranslationData>>({
    pt: {},
    en: {},
  });

  private loadedContexts = signal<Record<SupportedLanguages, Set<string>>>({
    pt: new Set(),
    en: new Set(),
  });

  private loadingPromises = new Map<string, Promise<void>>();

  private isLoaded = signal(false);
  readonly isLoadedSignal = this.isLoaded.asReadonly();

  readonly currentTranslations = computed(() => {
    const lang = this.languageService.language();
    return this.translations()[lang];
  });

  constructor() {
    // effect(() => {
    //   const lang = this.languageService.language();
    //   this.loadTranslations(lang);
    // });
  }

  private isTranslationLoaded(lang: SupportedLanguages): boolean {
    const translation = this.translations()[lang];

    if (!translation || typeof translation !== 'object') {
      return false;
    }

    const keys = Object.keys(translation);
    if (keys.length === 0) {
      return false;
    }

    // Verifica recursivamente se há valores válidos em todos os níveis
    const hasValidValues = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return obj.length > 0;
      }

      if (typeof obj !== 'object' || obj === null) {
        return false;
      }

      const objKeys = Object.keys(obj);
      if (objKeys.length === 0) {
        return false;
      }

      // Verifica se pelo menos um valor é válido
      return objKeys.some((key) => hasValidValues(obj[key]));
    };

    return hasValidValues(translation);
  }

  public loadTranslations(lang: SupportedLanguages): void {
    // Carrega os contextos básicos
    this.commonContexts.forEach((context) => {
      this.loadContext(lang, context);
    });
  }

  public loadContext(lang: SupportedLanguages, context: string): Promise<void> {
    // Se já carregou este contexto, não carrega novamente
    const loaded = this.loadedContexts()[lang];
    if (loaded.has(context)) {
      return Promise.resolve();
    }

    // Se já está carregando este contexto, retorna a Promise existente
    const cacheKey = `${lang}-${context}`;
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      console.debug(`${context} translations for ${lang} already loading, reusing promise...`);
      return existingPromise;
    }

    console.debug(`Loading ${context} translations for ${lang}...`);

    const promise = new Promise<void>((resolve, reject) => {
      this.http.get<TranslationData>(`/assets/i18n/${lang}/${context}.json`).subscribe({
        next: (data) => {
          console.debug(`${context} translations loaded for ${lang}:`, data);
          this.translations.update((current) => ({
            ...current,
            [lang]: this.mergeDeep(current[lang], data),
          }));
          this.loadedContexts.update((current) => ({
            ...current,
            [lang]: new Set([...current[lang], context]),
          }));
          this.isLoaded.set(true);
          this.loadingPromises.delete(cacheKey);
          resolve();
        },
        error: (error) => {
          console.error(`Failed to load ${context} translations for ${lang}:`, error);
          this.loadingPromises.delete(cacheKey);
          reject(error);
        },
      });
    });

    this.loadingPromises.set(cacheKey, promise);
    return promise;
  }

  private mergeDeep(target: any, source: any): any {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    // Se as traduções ainda não foram carregadas, retorna a chave original
    if (!this.isLoaded()) {
      return key;
    }

    const keys = key.split('.');
    let value: any = this.currentTranslations();

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key is not a string: ${key}`);
      return key;
    }

    return this.interpolate(value, params);
  }

  private interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) {
      return text;
    }

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  instant(key: string, params?: Record<string, string | number>): string {
    return this.translate(key, params);
  }
}
