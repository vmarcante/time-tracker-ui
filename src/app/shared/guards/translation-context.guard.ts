import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { LanguageService } from '../services/language.service';

/**
 * Guard that ensures translations for a specific context are loaded before activating a route.
 * @param context The translation context to load (e.g., 'auth', 'common', 'layout')
 * @returns A CanActivateFn that loads the translations and returns true
 */
export function translationContextGuard(context: string): CanActivateFn {
  return async () => {
    const translationService = inject(TranslationService);
    const languageService = inject(LanguageService);
    
    const currentLang = languageService.language();
    
    try {
      await translationService.loadContext(currentLang, context);
      return true;
    } catch (error) {
      console.error(`Failed to load ${context} translations:`, error);
      // Mesmo com erro, permite navegação
      return true;
    }
  };
}
