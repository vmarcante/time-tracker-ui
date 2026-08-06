import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-language-switcher',
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  protected languageService = inject(LanguageService);
  protected translationService = inject(TranslationService);

  protected ariaLabel = computed(() => {
    const targetLang = this.languageService.isPortuguese() ? 'English' : 'Português';
    return this.translationService.translate('language.switcher.ariaLabel', {
      language: targetLang,
    });
  });

  protected displayText = computed(() => 
    this.languageService.isPortuguese() ? 'EN' : 'PT'
  );

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }
}
