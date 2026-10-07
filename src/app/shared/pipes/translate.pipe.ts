import { Pipe, PipeTransform, inject, ChangeDetectorRef, OnDestroy, effect } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  pure: false,
  standalone: true,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private translationService = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef);
  private lastKey = '';
  private lastValue = '';

  constructor() {
    effect(() => {
      this.translationService.currentTranslations();

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
