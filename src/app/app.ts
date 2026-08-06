import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslationService } from './shared/services/translation.service';
import { LanguageService } from './shared/services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('time-tracker-ui');
  private translationService = inject(TranslationService);
  private languageService = inject(LanguageService);

  constructor() {
    // Carregar traduções inicialmente
    const initialLang = this.languageService.language();
    this.translationService.loadTranslations(initialLang);

    // Carregar traduções quando o idioma mudar
    effect(() => {
      const lang = this.languageService.language();
      this.translationService.loadTranslations(lang);
    });
  }
}
