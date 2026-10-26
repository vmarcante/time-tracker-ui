import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';
import { DialogService } from '../../../../../shared/services/dialog.service';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { ApiAdapterService } from '../../../../../shared/services';
import { AuthService } from '../../../services/auth.service';
import { AuthTokenService } from '../../../services/auth-token.service';
import { LoginInput } from '../../../models';
import { RegisterFormComponent } from '../../register/form/register-form.component';
import { PasswordResetRequestComponent } from '../../password-reset/request/password-reset-request.component';

@Component({
  selector: 'app-login-mobile-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TextInputComponent,
    ButtonComponent,
    TranslatePipe,
    DialogShellComponent,
  ],
  templateUrl: './login-mobile-dialog.component.html',
  styleUrl: './login-mobile-dialog.component.scss',
})
export class LoginMobileDialogComponent {
  private dialogService = inject(DialogService);
  private translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private tokenService = inject(AuthTokenService);
  private apiAdapterService = inject(ApiAdapterService);
  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<LoginMobileDialogComponent>);

  loginForm: FormGroup;
  errorMessage = signal<string>('');
  isLoading = computed(() => this.apiAdapterService.customLoadings().get('login') ?? false);

  constructor() {
    this.loginForm = this.buildLoginForm();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    const formValue = this.loginForm.value;
    const loginData: LoginInput = {
      username: formValue.username,
      password: formValue.password,
    };

    const request = this.authService.login(loginData);
    this.apiAdapterService.executeRequest(request, {
      customLoadingName: 'login',
      showErrorToast: false,
      onSuccess: () => {
        this.dialogRef.close(true);
      },
      onError: (error) => {
        this.errorMessage.set(error.error?.data?.message ?? 'auth.login.error.default');
      },
    });
  }

  openForgotPasswordDialog(): void {
    const passwordResetDialog = this.dialogService.openDialog<PasswordResetRequestComponent, void>(
      PasswordResetRequestComponent,
      {
        width: 'auto',
        closeCallback: () => {},
      }
    );

    // Fecha o login dialog após o password reset estar aberto
    passwordResetDialog.afterOpened().subscribe(() => {
      this.dialogRef.close();
    });
  }

  openRegister(): void {
    const closeCallback = (success?: boolean) => {
      if (success) {
        console.log('Registration successful');
      }
    };

    const registerDialog = this.dialogService.openDialog<RegisterFormComponent, boolean>(
      RegisterFormComponent,
      {
        width: '600px',
        closeCallback,
      },
      true
    );

    // Fecha o login dialog após o register estar aberto
    registerDialog.afterOpened().subscribe(() => {
      this.dialogRef.close();
    });
  }

  buildLoginForm(): FormGroup {
    return new FormGroup({
      username: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
    });
  }

  /**
   * Gets the forgot password text with <br> tags replaced by spaces
   * @returns The formatted forgot password text
   */
  protected get forgotPasswordText(): string {
    const text = this.translationService.translate('auth.login.form.forgotPassword');
    return text.replace(/<br\s*\/?>/gi, ' ');
  }
}
