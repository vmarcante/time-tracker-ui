import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { ToastrService } from '../../../../shared/services/toastr.service';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea/textarea-input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ConfirmationDialogComponent } from '../../../../shared/components/dialogs/confirmation/confirmation-dialog.component';
import { ConfirmationDialogConfiguration } from '../../../../shared/types/dialog.types';
import { DocumentsValidators } from '../../../../shared/validators/documents.validators';
import { ApiErrorResponse, PageWrapper } from '../../../../shared/types';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { AuthService } from '../../../auth/services/auth.service';
import { OnboardingApiService } from '../../../onboarding/services/api/onboarding.api.service';
import { CompanyInvitationApiService } from '../../../onboarding/services/api/company-invitation.api.service';
import { CompanyApiService } from '../../../onboarding/services/api/company.api.service';
import {
  CompanyInvitationOutput,
  CompanyPreviewOutput,
  CompleteOnboardingOutput,
} from '../../../onboarding/models';

type OnboardingView = 'choice' | 'pending';
type OnboardingMode = 'company' | 'independent' | 'owner';
type CompanyLookupStatus = 'idle' | 'checking' | 'found' | 'not-found';

@Component({
  selector: 'app-onboarding-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TextInputComponent,
    TextareaInputComponent,
    ButtonComponent,
    IconComponent,
  ],
  templateUrl: './onboarding-modal.component.html',
  styleUrl: './onboarding-modal.component.scss',
})
export class OnboardingModalComponent implements OnInit {
  private onboardingApiService = inject(OnboardingApiService);
  private invitationApiService = inject(CompanyInvitationApiService);
  private companyApiService = inject(CompanyApiService);
  private apiAdapterService = inject(ApiAdapterService);
  private toastrService = inject(ToastrService);
  private translationService = inject(TranslationService);
  private tokenService = inject(AuthTokenService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  readonly view = signal<OnboardingView>('choice');
  readonly mode = signal<OnboardingMode>('independent');
  readonly pendingCompanyName = signal('');
  readonly invitations = signal<CompanyInvitationOutput[]>([]);
  readonly invitationsLoading = signal(true);
  readonly processingCompanyId = signal<string | null>(null);
  readonly companyPreview = signal<CompanyPreviewOutput | null>(null);
  readonly companyLookupStatus = signal<CompanyLookupStatus>('idle');
  readonly ownerCompanyExists = signal<CompanyPreviewOutput | null>(null);

  readonly companyForm = new FormGroup({
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, DocumentsValidators.cnpj],
    }),
    requestReason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  readonly ownerForm = new FormGroup({
    legalName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tradeName: new FormControl('', { nonNullable: true }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, DocumentsValidators.cnpj],
    }),
  });

  readonly isSubmitting = computed(
    () => this.apiAdapterService.customLoadings().get('onboarding') ?? false,
  );

  ngOnInit(): void {
    const user = this.tokenService.currentUser();

    if (user?.pendingCompanyName) {
      this.pendingCompanyName.set(user.pendingCompanyName);
      this.view.set('pending');
      this.invitationsLoading.set(false);
      return;
    }

    if ((user?.pendingInvitations ?? 0) > 0) {
      this.loadInvitations();
    } else {
      this.invitationsLoading.set(false);
    }

    this.watchCompanyDocument();
    this.watchOwnerDocument();
  }

  submitCompany(): void {
    this.companyForm.markAllAsTouched();
    if (this.companyForm.invalid) {
      return;
    }

    this.openSubmitConfirmation(() => {
      const reason = this.companyForm.controls.requestReason.value.trim();
      const request = this.onboardingApiService.complete({
        document: this.companyForm.controls.document.value,
        requestReason: reason || undefined,
      });

      this.apiAdapterService.executeRequest(request, {
        customLoadingName: 'onboarding',
        onSuccess: (response) => this.handleOnboardingSuccess(response.data),
        onError: (error) => this.handleError(error, 'onboarding.errors.company'),
      });
    });
  }

  submitOwner(): void {
    this.ownerForm.markAllAsTouched();
    if (this.ownerForm.invalid) {
      return;
    }

    if (this.ownerCompanyExists()) {
      this.openCompanyExistsDialog();
      return;
    }

    this.openSubmitConfirmation(() => {
      const { legalName, tradeName, document } = this.ownerForm.getRawValue();
      const request = this.companyApiService.create({
        legalName: legalName.trim(),
        tradeName: tradeName.trim() || undefined,
        document,
      });

      this.apiAdapterService.executeRequest(request, {
        customLoadingName: 'onboarding',
        onSuccess: () => this.finishOnboarding(),
        onError: (error) => this.handleOwnerError(error),
      });
    });
  }

  submitIndependent(): void {
    this.openSubmitConfirmation(() => {
      const request = this.onboardingApiService.complete({ independent: true });

      this.apiAdapterService.executeRequest(request, {
        customLoadingName: 'onboarding',
        onSuccess: () => this.finishOnboarding(),
        onError: (error) => this.handleError(error, 'onboarding.errors.independent'),
      });
    });
  }

  private openSubmitConfirmation(onConfirm: () => void): void {
    const type = this.translationService.translate(
      `onboarding.confirmDialog.type.${this.mode()}`,
    );

    const config: ConfirmationDialogConfiguration = {
      title: this.translationService.translate('onboarding.confirmDialog.title'),
      message: this.translationService.translate('onboarding.confirmDialog.message', { type }),
      closeable: true,
      buttons: {
        cancel: {
          show: true,
          order: 1,
          name: 'cancel',
          text: this.translationService.translate('common.dialog.cancel'),
          color: 'secondary',
        },
        confirmation: {
          show: true,
          order: 2,
          name: 'confirm',
          text: this.translationService.translate('common.dialog.confirm'),
          color: 'primary',
        },
      },
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, { data: config });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirm) {
        onConfirm();
      }
    });
  }

  acceptInvitation(invitation: CompanyInvitationOutput): void {
    this.processingCompanyId.set(invitation.companyId);

    this.apiAdapterService.executeRequest(this.invitationApiService.accept(invitation.companyId), {
      ignoreLoading: true,
      onSuccess: () => {
        this.toastrService.successMessage(
          this.translationService.translate('onboarding.invitations.accepted', {
            company: invitation.companyName,
          }),
        );
        this.finishOnboarding();
      },
      onError: (error) => {
        this.processingCompanyId.set(null);
        this.handleError(error, 'onboarding.errors.invitation');
      },
    });
  }

  declineInvitation(invitation: CompanyInvitationOutput): void {
    this.processingCompanyId.set(invitation.companyId);

    this.apiAdapterService.executeRequest(this.invitationApiService.decline(invitation.companyId), {
      ignoreLoading: true,
      onSuccess: () => {
        this.processingCompanyId.set(null);
        this.invitations.update((list) =>
          list.filter((item) => item.membershipId !== invitation.membershipId),
        );
      },
      onError: (error) => {
        this.processingCompanyId.set(null);
        this.handleError(error, 'onboarding.errors.invitation');
      },
    });
  }

  logout(): void {
    const config: ConfirmationDialogConfiguration = {
      title: this.translationService.translate('onboarding.logoutDialog.title'),
      message: this.translationService.translate('onboarding.logoutDialog.message'),
      closeable: true,
      buttons: {
        cancel: {
          show: true,
          order: 1,
          name: 'cancel',
          text: this.translationService.translate('common.dialog.cancel'),
          color: 'secondary',
        },
        confirmation: {
          show: true,
          order: 2,
          name: 'confirm',
          text: this.translationService.translate('common.dialog.confirm'),
          color: 'error',
        },
      },
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, { data: config });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirm) {
        this.executeLogout();
      }
    });
  }

  private executeLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }

  private watchCompanyDocument(): void {
    this.companyForm.controls.document.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadCompanyPreview());
  }

  private watchOwnerDocument(): void {
    this.ownerForm.controls.document.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.checkOwnerDocument());
  }

  private checkOwnerDocument(): void {
    const control = this.ownerForm.controls.document;

    if (control.invalid || !control.value) {
      this.ownerCompanyExists.set(null);
      return;
    }

    this.apiAdapterService.executeRequest(
      this.companyApiService.getByDocument(control.value),
      {
        ignoreLoading: true,
        onSuccess: (response) => this.ownerCompanyExists.set(response.data),
        onError: () => this.ownerCompanyExists.set(null),
      },
    );
  }

  private loadCompanyPreview(): void {
    const control = this.companyForm.controls.document;

    if (control.invalid || !control.value) {
      this.companyPreview.set(null);
      this.companyLookupStatus.set('idle');
      return;
    }

    this.companyLookupStatus.set('checking');

    this.apiAdapterService.executeRequest(
      this.companyApiService.getByDocument(control.value),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.companyPreview.set(response.data);
          this.companyLookupStatus.set('found');
        },
        onError: () => {
          this.companyPreview.set(null);
          this.companyLookupStatus.set('not-found');
        },
      },
    );
  }

  private handleOwnerError(error: ApiErrorResponse): void {
    const errorKey = error?.error?.data?.key;

    if (errorKey === 'company.document.already.exists') {
      this.openCompanyExistsDialog();
      return;
    }

    this.handleError(error, 'onboarding.errors.owner');
  }

  private openCompanyExistsDialog(): void {
    const config: ConfirmationDialogConfiguration = {
      title: this.translationService.translate('onboarding.owner.existsDialog.title'),
      message: this.translationService.translate('onboarding.owner.existsDialog.message'),
      closeable: true,
      buttons: {
        cancel: {
          show: true,
          order: 1,
          name: 'cancel',
          text: this.translationService.translate('onboarding.owner.existsDialog.cancel'),
          color: 'secondary',
        },
        confirmation: {
          show: true,
          order: 2,
          name: 'linkToCompany',
          text: this.translationService.translate('onboarding.owner.existsDialog.confirm'),
          color: 'primary',
        },
      },
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, { data: config });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.linkToCompany) {
        this.applyCompanyLink();
      }
    });
  }

  protected applyCompanyLink(): void {
    this.mode.set('company');
    this.companyForm.controls.document.setValue(this.ownerForm.controls.document.value);
    this.loadCompanyPreview();
  }

  private loadInvitations(): void {
    this.invitationsLoading.set(true);

    this.apiAdapterService.executeRequest(this.invitationApiService.listMyInvitations(1, 10), {
      ignoreLoading: true,
      onSuccess: (response) => {
        const page: PageWrapper<CompanyInvitationOutput> = response.data;
        this.invitations.set(page.content);
        this.invitationsLoading.set(false);
      },
      onError: () => {
        this.invitations.set([]);
        this.invitationsLoading.set(false);
      },
    });
  }

  private handleOnboardingSuccess(output: CompleteOnboardingOutput): void {
    if (output.membershipPending && output.companyName) {
      this.pendingCompanyName.set(output.companyName);
      this.view.set('pending');
      return;
    }

    this.finishOnboarding();
  }

  private finishOnboarding(): void {
    this.tokenService.loadCurrentUser();
    this.router.navigate(['/home']);
  }

  private handleError(error: ApiErrorResponse, fallbackKey: string): void {
    const errorKey = error?.error?.data?.key;
    const translationKey = errorKey ? `onboarding.errors.${errorKey}` : fallbackKey;
    const translated = this.translationService.translate(translationKey);

    const message =
      translated === translationKey
        ? this.translationService.translate(fallbackKey)
        : translated;

    this.toastrService.errorMessage(message);
  }
}
