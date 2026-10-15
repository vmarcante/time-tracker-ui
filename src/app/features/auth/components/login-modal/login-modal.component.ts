import { Component, inject, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { PopoverComponent } from '../../../../shared/components/popover/popover.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogService } from '../../../../shared/services/dialog.service';
import { ResponsiveService } from '../../../../shared/services/responsive.service';
import { ApiAdapterService } from '../../../../shared/services';
import { AuthService } from '../../services/auth.service';
import { AuthTokenService } from '../../services/auth-token.service';
import { LoginInput } from '../../models';
import { resolvePostLoginRoute } from '../../../../shared/utils/role-redirect.util';
import { RegisterFormComponent } from '../register/form/register-form.component';
import { PasswordResetRequestComponent } from '../password-reset/request/password-reset-request.component';
import { LoginMobileDialogComponent } from './mobile/login-mobile-dialog.component';

@Component({
  selector: 'app-login-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PopoverComponent,
    TextInputComponent,
    ButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.scss',
})
export class LoginModalComponent {
  private dialogService = inject(DialogService);
  protected responsiveService = inject(ResponsiveService);
  private authService = inject(AuthService);
  private tokenService = inject(AuthTokenService);
  private apiAdapterService = inject(ApiAdapterService);
  private router = inject(Router);
  @ViewChild('popover') popover?: PopoverComponent;

  loginForm: FormGroup;
  errorMessage = signal<string>('');
  isLoading = computed(() => this.apiAdapterService.customLoadings().get('login') ?? false);

  constructor() {
    this.loginForm = this.buildLoginForm();
  }

  open(): void {
    this.resetForm();

    if (this.responsiveService.isMobileOrTablet()) {
      this.openMobileDialog();
    } else {
      this.popover?.toggle();
    }
  }

  private openMobileDialog(): void {
    const dialogRef = this.dialogService.openDialog(LoginMobileDialogComponent, {
      width: '100%',
      height: '100%',
      autoAdjustSize: false,
      closeCallback: (result) => {
        if (result) {
          this.redirectAfterLogin();
        }
      },
    });
  }

  close(): void {
    this.popover?.close();
    this.resetForm();
  }

  private resetForm(): void {
    this.loginForm.reset();
    this.errorMessage.set('');
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage.set('');
    const formValue = this.loginForm.value;
    const loginInput: LoginInput = {
      username: formValue.username,
      password: formValue.password,
    };

    const request = this.authService.login(loginInput);
    this.apiAdapterService.executeRequest(request, {
      customLoadingName: 'login',
      onSuccess: () => {
        this.close();
        this.redirectAfterLogin();
      },
      onError: (error) => {
        this.errorMessage.set(error.error?.data?.message ?? 'auth.login.error.default');
      },
    });
  }

  private redirectAfterLogin(): void {
    const returnUrl = this.tokenService.getReturnUrl();
    if (returnUrl) {
      this.tokenService.clearReturnUrl();
      this.router.navigate([returnUrl]);
      return;
    }

    this.tokenService.loadCurrentUser().then((user) => {
      this.router.navigate([user ? resolvePostLoginRoute(user) : '/tracker']);
    });
  }

  openForgotPasswordDialog(): void {
    this.close();

    this.dialogService.openDialog<PasswordResetRequestComponent, void>(
      PasswordResetRequestComponent,
      {
        width: 'auto',
        closeCallback: () => {},
      },
    );
  }

  openRegister(): void {
    this.close();

    const closeCallback = (success?: boolean) => {
      if (success) {
        // TODO: Handle registration success
        console.log('Registration successful');
      }
    };

    this.dialogService.openDialog<RegisterFormComponent, boolean>(
      RegisterFormComponent,
      {
        width: '600px',
        closeCallback,
      },
      true,
    );
  }

  buildLoginForm(): FormGroup {
    return new FormGroup({
      username: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
    });
  }
}
