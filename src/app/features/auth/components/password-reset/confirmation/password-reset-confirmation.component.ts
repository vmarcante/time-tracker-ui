import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { ApiAdapterService } from '../../../../../shared/services';
import { AuthApiService } from '../../../services/api/auth.api.service';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ProgressBarComponent } from '../../../../../shared/components/progress-bar/progress-bar.component';
import { InputValidators } from '../../../../../shared/validators/input.validators';
import { DocumentsValidators } from '../../../../../shared/validators/documents.validators';

@Component({
  selector: 'app-password-reset-confirmation',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TextInputComponent,
    ButtonComponent,
    ProgressBarComponent,
  ],
  templateUrl: './password-reset-confirmation.component.html',
  styleUrl: './password-reset-confirmation.component.scss',
})
export class PasswordResetConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authApiService = inject(AuthApiService);
  private apiAdapterService = inject(ApiAdapterService);
  private translationService = inject(TranslationService);

  resetPasswordForm: FormGroup;
  token = signal<string | null>(null);
  hasTokenError = signal(false);
  isSubmitted = signal(false);
  errorMessage = signal('');
  countdown = signal(5);
  isResetting = computed(
    () => this.apiAdapterService.customLoadings().get('resetPassword') ?? false,
  );

  constructor() {
    this.resetPasswordForm = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const token = params['token'];

      if (!token) {
        this.hasTokenError.set(true);
        return;
      }

      this.token.set(token);
    });
  }

  protected get passwordStrength(): number {
    const requirements = this.passwordRequirements;
    const metCount = requirements.filter((req) => req.met).length;
    return (metCount / requirements.length) * 100;
  }

  protected get passwordRequirements(): {
    label: string;
    met: boolean;
    classes: Record<string, boolean>;
  }[] {
    const value = (this.resetPasswordForm.get('newPassword')?.value as string) || '';

    const requirements = [
      {
        label: this.translationService.translate('auth.register.validation.passwordMinLength'),
        met: value.length >= 8,
      },
      {
        label: this.translationService.translate('auth.register.validation.passwordLowercase'),
        met: /[a-z]/.test(value),
      },
      {
        label: this.translationService.translate('auth.register.validation.passwordUppercase'),
        met: /[A-Z]/.test(value),
      },
      {
        label: this.translationService.translate('auth.register.validation.passwordSpecialChar'),
        met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(value),
      },
      {
        label: this.translationService.translate('auth.register.validation.passwordMatch'),
        met: value !== '' && !this.resetPasswordForm.hasError('passwordMismatch'),
      },
    ];

    return requirements.map((req) => ({
      ...req,
      classes: {
        'password-requirements__item': true,
        'password-requirements__item--met': req.met,
      },
    }));
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token()) {
      InputValidators.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    this.errorMessage.set('');
    const formValue = this.resetPasswordForm.value;

    const request = this.authApiService.resetPassword({
      token: this.token()!,
      newPassword: formValue.newPassword,
    });

    this.apiAdapterService.executeRequest(request, {
      customLoadingName: 'resetPassword',
      showErrorToast: false,
      onSuccess: () => {
        this.isSubmitted.set(true);
        this.startCountdown();
      },
      onError: (error) => {
        this.errorMessage.set(error.error?.data?.message ?? 'auth.resetPassword.error.default');
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/']);
  }

  private startCountdown(): void {
    const interval = setInterval(() => {
      this.countdown.update((value) => value - 1);

      if (this.countdown() === 0) {
        clearInterval(interval);
        this.goToLogin();
      }
    }, 1000);
  }

  private createForm(): FormGroup {
    return new FormGroup(
      {
        newPassword: new FormControl('', [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          DocumentsValidators.passwordStrength,
        ]),
        confirmPassword: new FormControl('', [Validators.required]),
      },
      {
        validators: InputValidators.doubleFormControlsMatchValidation(
          'newPassword',
          'confirmPassword',
          'passwordMismatch',
        ),
      },
    );
  }
}
