import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { CurrentUserOutput } from '../../models';
import { LanguageService } from '../../../../shared/services/language.service';
import { PersonApiService } from '../../services/api/person.api.service';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { SupportedLanguages } from '../../../../shared/types/supported-languages.type';

@Component({
  selector: 'app-user-menu',
  imports: [CommonModule, TranslatePipe, IconComponent],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  private languageService = inject(LanguageService);
  private personApiService = inject(PersonApiService);
  private apiAdapterService = inject(ApiAdapterService);

  user = input.required<CurrentUserOutput>();
  logout = output<void>();
  profileClick = output<void>();

  readonly currentLanguage = this.languageService.language;
  readonly localeLoading = signal(false);

  readonly languages: { code: SupportedLanguages; locale: string; label: string }[] = [
    { code: 'pt', locale: 'pt-BR', label: 'PT' },
    { code: 'en', locale: 'en-US', label: 'EN' },
  ];

  selectLanguage(lang: { code: SupportedLanguages; locale: string }, event: Event): void {
    event.stopPropagation();

    if (this.currentLanguage() === lang.code || this.localeLoading()) {
      return;
    }

    this.localeLoading.set(true);

    this.apiAdapterService.executeRequest(this.personApiService.updateLocale(lang.locale), {
      ignoreLoading: true,
      onSuccess: () => {
        this.languageService.setLanguage(lang.code);
        this.localeLoading.set(false);
      },
      onError: () => {
        this.localeLoading.set(false);
      },
    });
  }
}
