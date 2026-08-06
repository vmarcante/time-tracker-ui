import { Pipe, PipeTransform, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { LanguageService } from '../services/language.service';
import { effect } from '@angular/core';

@Pipe({
  name: 'translate',
  pure: false,
  standalone: true,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private translationService = inject(TranslationService);
  private languageService = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);
  private lastKey = '';
  private lastValue = '';

  constructor() {
    // Atualiza o pipe quando o idioma muda ou quando as traduções são carregadas
    effect(() => {
      const lang = this.languageService.language();
      const isLoaded = this.translationService.isLoadedSignal();

      // Limpa o cache sempre que isLoaded muda ou o idioma muda
      this.lastKey = '';
      this.lastValue = '';

      this.cdr.markForCheck();
    });
  }

  transform(key: string | null, params?: Record<string, string | number>): string {
    if (!key) {
      return '';
    }

    const cacheKey = `${key}:${JSON.stringify(params || {})}`;

    if (this.lastKey === cacheKey) {
      return this.lastValue;
    }

    this.lastKey = cacheKey;
    this.lastValue = this.translationService.translate(key, params);

    return this.lastValue;
  }

  ngOnDestroy(): void {
    // Cleanup se necessário
  }
}
