import { Component, signal, inject, effect, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslationService } from './shared/services/translation.service';
import { LanguageService } from './shared/services/language.service';
import { DialogService } from './shared/services/dialog.service';
import { AuthTokenService } from './features/auth/services/auth-token.service';
import { OnboardingModalComponent } from './features/main/components/onboarding/onboarding-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('time-tracker-ui');
  private translationService = inject(TranslationService);
  private languageService = inject(LanguageService);
  private authTokenService = inject(AuthTokenService);
  private dialogService = inject(DialogService);

  private onboardingDialogRef?: MatDialogRef<OnboardingModalComponent>;
  private onboardingDialogOpening = false;

  protected readonly showOnboarding = computed(
    () =>
      this.authTokenService.isAuthenticated() &&
      this.authTokenService.currentUser()?.affiliation === 'PENDING',
  );

  constructor() {
    // Carregar traduções inicialmente
    const initialLang = this.languageService.language();
    this.translationService.loadTranslations(initialLang);

    // Carregar traduções quando o idioma mudar
    effect(() => {
      const lang = this.languageService.language();
      this.translationService.loadTranslations(lang);
    });

    // Gate global de onboarding: abre o modal enquanto o usuário estiver PENDING
    effect(() => {
      if (!this.showOnboarding()) {
        const ref = this.onboardingDialogRef;
        this.onboardingDialogRef = undefined;
        ref?.close();
        return;
      }

      const lang = this.languageService.language();

      if (this.onboardingDialogRef || this.onboardingDialogOpening) {
        this.translationService.loadContext(lang, 'onboarding');
        return;
      }

      this.onboardingDialogOpening = true;
      this.translationService
        .loadContext(lang, 'onboarding')
        .catch(() => {})
        .finally(() => {
          this.onboardingDialogOpening = false;

          if (this.showOnboarding() && !this.onboardingDialogRef) {
            this.onboardingDialogRef = this.dialogService.openDialog<OnboardingModalComponent>(
              OnboardingModalComponent,
              {
                width: '720px',
                disableClose: true,
                panelClass: ['onboarding-modal-panel'],
                backdropClass: 'onboarding-modal-backdrop',
                closeCallback: () => {
                  this.onboardingDialogRef = undefined;
                },
              },
            );
          }
        });
    });
  }
}
