import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupportedLanguages, SUPPORTED_LANGUAGES } from '../types/supported-languages.type';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly STORAGE_KEY = environment.storageKeys.language;
  private readonly DEFAULT_LANGUAGE: SupportedLanguages =
    environment.defaultLanguage as SupportedLanguages;
  private readonly SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;

  private currentLanguage = signal<SupportedLanguages>(this.getInitialLanguage());

  readonly language = this.currentLanguage.asReadonly();
  readonly isPortuguese = computed(() => this.currentLanguage() === 'pt');
  readonly isEnglish = computed(() => this.currentLanguage() === 'en');

  private getInitialLanguage(): SupportedLanguages {
    const stored = localStorage.getItem(this.STORAGE_KEY) as SupportedLanguages;
    if (stored && this.isSupportedLanguage(stored)) {
      return stored;
    }

    const browserLang = navigator.language.split('-')[0];
    if (browserLang && this.isSupportedLanguage(browserLang)) {
      return browserLang;
    }

    return this.DEFAULT_LANGUAGE;
  }

  private isSupportedLanguage(language: string): language is SupportedLanguages {
    return this.SUPPORTED_LANGUAGES.includes(language as SupportedLanguages);
  }

  setLanguage(lang: SupportedLanguages): void {
    if (!this.isSupportedLanguage(lang)) {
      console.warn(`Language ${lang} is not supported. Using default.`);
      return;
    }

    this.currentLanguage.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }

  toggleLanguage(): void {
    const currentIndex = this.SUPPORTED_LANGUAGES.indexOf(this.currentLanguage());
    const nextIndex = (currentIndex + 1) % this.SUPPORTED_LANGUAGES.length;
    const newLang = this.SUPPORTED_LANGUAGES[nextIndex];
    if (newLang) {
      this.setLanguage(newLang);
    }
  }

  getAcceptLanguageHeader(): string {
    return this.currentLanguage();
  }

  getSupportedLanguages(): readonly SupportedLanguages[] {
    return this.SUPPORTED_LANGUAGES;
  }
}
