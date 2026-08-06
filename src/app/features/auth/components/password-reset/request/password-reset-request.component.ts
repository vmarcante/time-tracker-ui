import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ApiAdapterService } from '../../../../../shared/services';
import { AuthApiService } from '../../../services/api/auth.api.service';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';
import { ResponsiveService } from '../../../../../shared/services/responsive.service';

@Component({
  selector: 'app-password-reset-request',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TextInputComponent,
    ButtonComponent,
    DialogShellComponent,
  ],
  templateUrl: './password-reset-request.component.html',
  styleUrl: './password-reset-request.component.scss',
})
export class PasswordResetRequestComponent {
  private authApiService = inject(AuthApiService);
  private apiAdapterService = inject(ApiAdapterService);
  private dialogRef = inject(MatDialogRef<PasswordResetRequestComponent>);
  protected responsiveService = inject(ResponsiveService);
  protected isMobileOrTablet = computed(() => this.responsiveService.isMobileOrTablet());

  forgotPasswordForm: FormGroup;
  isSubmitted = signal(false);
  errorMessage = signal('');
  isRequesting = computed(
    () => this.apiAdapterService.customLoadings().get('forgotPassword') ?? false,
  );

  constructor() {
    this.forgotPasswordForm = this.createForm();
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.errorMessage.set('');
    const formValue = this.forgotPasswordForm.value;

    const request = this.authApiService.requestPasswordReset({
      username: formValue.username,
      email: formValue.email,
    });

    this.apiAdapterService.executeRequest(request, {
      customLoadingName: 'forgotPassword',
      onSuccess: () => {
        this.isSubmitted.set(true);
      },
      onError: (error) => {
        this.errorMessage.set(
          error.error?.data?.message ?? 'auth.forgotPassword.error.default',
        );
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  private createForm(): FormGroup {
    return new FormGroup({
      username: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
    });
  }
}
