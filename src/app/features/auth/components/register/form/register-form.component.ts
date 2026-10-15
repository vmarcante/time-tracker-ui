import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RegisterApiService } from '../../../services/api/register.api.service';
import { CreateUserInput } from '../../../models';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { ApiAdapterService } from '../../../../../shared/services';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { IntegerInputComponent } from '../../../../../shared/components/inputs/integer/integer-input.component';
import { ToggleInputComponent } from '../../../../../shared/components/inputs/toggle/toggle-input.component';
import { SteppedPanelLayoutComponent } from '../../../../../shared/components/stepped-panel-layout/stepped-panel-layout.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ProgressBarComponent } from '../../../../../shared/components/progress-bar/progress-bar.component';
import { StepProgressConfig, ButtonColorType } from '../../../../../shared/types';
import { InputValidators } from '../../../../../shared/validators/input.validators';
import { DocumentsValidators } from '../../../../../shared/validators/documents.validators';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';
import { ResponsiveService } from '../../../../../shared/services/responsive.service';

@Component({
  selector: 'app-register-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TextInputComponent,
    IntegerInputComponent,
    ToggleInputComponent,
    SteppedPanelLayoutComponent,
    ButtonComponent,
    ProgressBarComponent,
    DialogShellComponent,
  ],
  templateUrl: './register-form.component.html',
  styleUrls: ['./register-form.component.scss'],
})
export class RegisterFormComponent implements OnInit {
  // ===========
  // DEPENDENCIES
  // ===========

  private registerApiService = inject(RegisterApiService);
  private apiAdapterService = inject(ApiAdapterService);
  private translationService = inject(TranslationService);
  protected responsiveService = inject(ResponsiveService);
  protected isMobileOrTablet = this.responsiveService.isMobileOrTablet;

  // ===========
  // PROPERTIES
  // ===========

  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;

  currentStep = 1;
  totalSteps = 3;

  isRegistering = computed(() => this.apiAdapterService.customLoadings().get('register') ?? false);

  usernameAvailability = signal<'checking' | 'available' | 'unavailable' | null>(null);
  emailAvailability = signal<'checking' | 'available' | 'unavailable' | null>(null);
  isCompleted = signal(false);
  registeredEmail = signal('');

  // ===========
  // LIFECYCLE
  // ===========

  constructor(public dialogRef: MatDialogRef<RegisterFormComponent, boolean>) {
    this.registerForm = this.createRegisterFormGroup();
  }

  ngOnInit(): void {
    this.setupUsernameValidation();
    this.setupEmailValidation();
  }

  // ===========
  // LAYOUT GETTERS
  // ===========

  protected get successMessage(): string {
    const email = this.registeredEmail();
    if (email) {
      return this.translationService.translate('auth.register.success', { email });
    }
    return this.translationService.translate('auth.register.success');
  }

  protected get stepProgressConfig(): StepProgressConfig {
    const step1Valid = this.isStepValid(1);
    const step2Valid = this.isStepValid(2);
    const step3Valid = this.isStepValid(3);

    return {
      steps: [
        {
          label: this.translationService.translate('auth.register.steps.1'),
          ariaLabel: this.translationService.translate('auth.register.steps.1'),
          valid: this.currentStep === 1 && step1Valid,
          disabled: this.isStepDisabled(1),
          buttonColor: this.getStepButtonColor(1, step1Valid),
        },
        {
          label: this.translationService.translate('auth.register.steps.2'),
          ariaLabel: this.translationService.translate('auth.register.steps.2'),
          valid: this.currentStep === 2 && step2Valid,
          disabled: this.isStepDisabled(2),
          buttonColor: this.getStepButtonColor(2, step2Valid),
        },
        {
          label: this.translationService.translate('auth.register.steps.3'),
          ariaLabel: this.translationService.translate('auth.register.steps.3'),
          valid: this.currentStep === 3 && step3Valid,
          disabled: this.isStepDisabled(3),
          buttonColor: this.getStepButtonColor(3, step3Valid),
        },
      ],
    };
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
    const value = (this.registerForm.get('password')?.value as string) || '';

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
        met: value !== '' && !this.registerForm.hasError('passwordMismatch'),
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

  protected get submitButtonText(): string {
    if (this.isRegistering()) {
      return this.translationService.translate('auth.register.form.submitting');
    }

    if (this.currentStep === this.totalSteps) {
      return this.translationService.translate('auth.register.form.submit');
    }

    return this.translationService.translate('auth.register.form.next');
  }

  protected get isSubmitDisabled(): boolean {
    if (this.isRegistering()) {
      return true;
    }

    if (this.currentStep !== this.totalSteps) {
      return false;
    }

    return (
      this.registerForm.invalid ||
      this.usernameAvailability() !== 'available' ||
      this.emailAvailability() !== 'available'
    );
  }
  // ===========
  // EVENT HANDLERS
  // ===========

  onComplete(): void {
    this.dialogRef.close(true);
  }

  protected onSubmit(): void {
    if (this.currentStep !== this.totalSteps) {
      this.nextStep();
      return;
    }

    if (this.registerForm.invalid || this.isRegistering()) {
      InputValidators.markFormGroupTouched(this.registerForm);
      return;
    }

    if (this.usernameAvailability() !== 'available' || this.emailAvailability() !== 'available') {
      return;
    }

    this.sendRegister();
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps || step === this.currentStep) {
      return;
    }

    if (step > this.currentStep && !this.isStepValid(this.currentStep)) {
      return;
    }

    this.currentStep = step;
  }

  // ===========
  // FORM & VALIDATION
  // ===========

  private createRegisterFormGroup(): FormGroup {
    return new FormGroup(
      {
        username: new FormControl('', [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          DocumentsValidators.username,
        ]),
        name: new FormControl('', [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
          DocumentsValidators.fullName,
        ]),
        email: new FormControl('', [Validators.required, Validators.email]),
        phone: new FormControl('', [DocumentsValidators.phoneNumber]),
        age: new FormControl('', [Validators.required, Validators.min(18), Validators.max(120)]),
        password: new FormControl('', [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          DocumentsValidators.passwordStrength,
        ]),
        confirmPassword: new FormControl('', [Validators.required]),
        consent: new FormControl(false, [Validators.requiredTrue]),
      },
      {
        validators: InputValidators.doubleFormControlsMatchValidation(
          'password',
          'confirmPassword',
          'passwordMismatch',
        ),
      },
    );
  }

  private setupUsernameValidation(): void {
    if (!this.registerForm) {
      return;
    }

    const userNameControl = this.registerForm.get('username');
    if (!userNameControl) {
      return;
    }

    userNameControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((username) => {
          const control = this.registerForm.get('username');

          if (!control) {
            return of(null);
          }

          if (!username || username.length < 3 || control.invalid) {
            this.usernameAvailability.set(null);
            InputValidators.insertErrorOnControl(control, 'availability', true);
            return of(null);
          }

          this.usernameAvailability.set('checking');
          return from(
            this.apiAdapterService.executeRequestWithPromise(
              this.registerApiService.checkUsernameAvailability(username),
              { customLoadingName: 'usernameAvailability' },
            ),
          ).pipe(
            map((response) => {
              const isAvailable = response.data;
              const availability = isAvailable ? 'available' : 'unavailable';
              this.usernameAvailability.set(availability);
              InputValidators.insertErrorOnControl(control, 'availability', !isAvailable);
              return isAvailable;
            }),
            catchError(() => {
              this.usernameAvailability.set(null);
              InputValidators.insertErrorOnControl(control, 'availability', true);
              return of(null);
            }),
          );
        }),
      )
      .subscribe();
  }

  private setupEmailValidation(): void {
    if (!this.registerForm) {
      return;
    }

    const emailControl = this.registerForm.get('email');
    if (!emailControl) {
      return;
    }

    emailControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) => {
          const control = this.registerForm.get('email');

          if (!control) {
            return of(null);
          }

          if (!email || control.invalid) {
            this.emailAvailability.set(null);
            InputValidators.insertErrorOnControl(control, 'availability', true);
            return of(null);
          }

          this.emailAvailability.set('checking');
          return from(
            this.apiAdapterService.executeRequestWithPromise(
              this.registerApiService.checkEmailAvailability(email),
              { customLoadingName: 'emailAvailability' },
            ),
          ).pipe(
            map((response) => {
              const isAvailable = response.data;
              const availability = isAvailable ? 'available' : 'unavailable';
              this.emailAvailability.set(availability);
              InputValidators.insertErrorOnControl(control, 'availability', !isAvailable);
              return isAvailable;
            }),
            catchError(() => {
              this.emailAvailability.set(null);
              InputValidators.insertErrorOnControl(control, 'availability', true);
              return of(null);
            }),
          );
        }),
      )
      .subscribe((isAvailable) => {
        if (isAvailable && this.currentStep === 1) {
          this.nextStep();
        }
      });
  }

  private isStepValid(step: number): boolean {
    const fieldsByStep: Record<number, string[]> = {
      1: ['email'],
      2: ['email', 'username', 'name', 'phone', 'age'],
      3: ['password', 'confirmPassword', 'consent'],
    };

    const fields = fieldsByStep[step];
    if (!fields) {
      return false;
    }

    const fieldsValid = fields.every((fieldName) => {
      const control = this.registerForm.get(fieldName);
      if (!control) {
        return false;
      }
      control.markAsTouched();
      return control.valid;
    });

    if (!fieldsValid) {
      return false;
    }

    if (step === 1 && this.emailAvailability() !== 'available') {
      return false;
    }

    if (step === 2 && this.usernameAvailability() !== 'available') {
      return false;
    }

    return true;
  }

  // ===========
  // PRIVATE HELPERS
  // ===========

  private nextStep(): void {
    if (!this.isStepValid(this.currentStep)) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  private sendRegister(): void {
    const formValue = this.registerForm.value;
    const userData: CreateUserInput = {
      username: formValue.username,
      name: formValue.name,
      email: formValue.email,
      phone: formValue.phone || '',
      password: formValue.password,
      age: formValue.age,
    };

    const request = this.registerApiService.register(userData);
    this.apiAdapterService.executeRequest(request, {
      customLoadingName: 'register',
      onSuccess: () => {
        this.registeredEmail.set(userData.email);
        this.registerForm.reset();
        this.usernameAvailability.set(null);
        this.emailAvailability.set(null);
        this.isCompleted.set(true);
      },
      onError: (error: unknown) => {},
    });
  }

  private getStepButtonColor(step: number, isValid: boolean): ButtonColorType {
    if (step < this.currentStep) {
      return 'primary';
    }

    if (isValid || step === this.currentStep) {
      return 'primary';
    }

    return 'secondary';
  }

  private isStepDisabled(step: number): boolean {
    return (
      step > this.currentStep + 1 ||
      (step === this.currentStep + 1 && !this.isStepValid(this.currentStep))
    );
  }
}
