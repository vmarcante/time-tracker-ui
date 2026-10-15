import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { IntegerInputComponent } from '../../../../shared/components/inputs/integer/integer-input.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select/select-input.component';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { resolvePostLoginRoute } from '../../../../shared/utils/role-redirect.util';
import { PersonApiService } from '../../../auth/services/api/person.api.service';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { LanguageService } from '../../../../shared/services/language.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { ToastrService } from '../../../../shared/services/toastr.service';
import { SupportedLanguages } from '../../../../shared/types/supported-languages.type';
import { DocumentsValidators } from '../../../../shared/validators/documents.validators';

@Component({
  selector: 'app-settings-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    TextInputComponent,
    IntegerInputComponent,
    SelectInputComponent,
  ],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent implements OnInit {
  private authTokenService = inject(AuthTokenService);
  private personApiService = inject(PersonApiService);
  private apiAdapterService = inject(ApiAdapterService);
  private languageService = inject(LanguageService);
  private translationService = inject(TranslationService);
  private toastrService = inject(ToastrService);
  private router = inject(Router);

  readonly currentUser = this.authTokenService.currentUser;
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);

  readonly initials = computed(() => {
    const name = this.currentUser()?.name ?? '';
    const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  });

  readonly localeOptions = computed(() => [
    { value: 'pt-BR', label: this.translationService.translate('profile.locale.pt-BR') },
    { value: 'en-US', label: this.translationService.translate('profile.locale.en-US') },
  ]);

  readonly nameControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(100),
    DocumentsValidators.fullName,
  ]);
  readonly phoneControl = new FormControl('', [DocumentsValidators.phoneNumber]);
  readonly ageControl = new FormControl<number | null>(null, [
    Validators.min(18),
    Validators.max(120),
  ]);
  readonly localeControl = new FormControl('');
  readonly emailControl = new FormControl({ value: '', disabled: true });

  readonly form = new FormGroup({
    name: this.nameControl,
    phone: this.phoneControl,
    age: this.ageControl,
    locale: this.localeControl,
  });

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.form.patchValue({
        name: user.name,
        phone: user.phone ?? '',
        age: user.age ?? null,
        locale: this.normalizeLocale(user.locale),
      });
      this.emailControl.setValue(user.email);
    }
  }

  private normalizeLocale(locale: string | null | undefined): string {
    return locale?.toLowerCase().startsWith('en') ? 'en-US' : 'pt-BR';
  }

  goBack(): void {
    const user = this.authTokenService.currentUser();
    this.router.navigate([user ? resolvePostLoginRoute(user) : '/tracker']);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, phone, age, locale } = this.form.getRawValue();
    const currentLocale = this.normalizeLocale(this.currentUser()?.locale);
    const localeChanged = !!locale && locale !== currentLocale;

    this.saving.set(true);
    this.saveSuccess.set(false);

    this.apiAdapterService.executeRequest(
      this.personApiService.updateProfile({
        name: name!,
        phone: phone || undefined,
        age: age ?? undefined,
      }),
      {
        ignoreLoading: true,
        onSuccess: () => {
          if (localeChanged) {
            this.apiAdapterService.executeRequest(
              this.personApiService.updateLocale(locale!),
              {
                ignoreLoading: true,
                onSuccess: () => {
                  const langCode = locale!.startsWith('pt') ? 'pt' : 'en';
                  this.languageService.setLanguage(langCode as SupportedLanguages);
                  this.finishSave();
                },
                onError: () => {
                  this.toastrService.errorMessage(
                    this.translationService.translate('profile.toast.localeError'),
                  );
                  this.finishSave();
                },
              },
            );
          } else {
            this.finishSave();
          }
        },
        onError: () => {
          this.saving.set(false);
          this.toastrService.errorMessage(
            this.translationService.translate('profile.toast.error'),
          );
        },
      },
    );
  }

  private finishSave(): void {
    this.saving.set(false);
    this.saveSuccess.set(true);
    this.authTokenService.reloadCurrentUser();
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }
}
