import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { IntegerInputComponent } from '../../../../../shared/components/inputs/integer/integer-input.component';
import { SelectInputComponent } from '../../../../../shared/components/inputs/select/select-input.component';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';
import { SteppedPanelLayoutComponent } from '../../../../../shared/components/stepped-panel-layout/stepped-panel-layout.component';
import { SelectOption } from '../../../../../shared/types/input.types';
import { ButtonColorType } from '../../../../../shared/types/button.types';
import { StepProgressConfig } from '../../../../../shared/types/step-progress.types';
import { InputValidators } from '../../../../../shared/validators/input.validators';
import { DocumentsValidators } from '../../../../../shared/validators/documents.validators';
import { CompanyRole } from '../../../../auth/models';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { ApiAdapterService } from '../../../../../shared/services/api/api-adapter.service';
import { CompanyManagementApiService } from '../../../services/company-management.api.service';
import {
  PersonInviteLookupOutput,
  PersonInviteLookupStatus,
} from '../../../models/company-management.model';

export interface InviteMemberDialogData {
  companyId: string;
  companyRole: CompanyRole;
}

export interface InviteMemberDialogResult {
  confirmed: true;
  action: 'invite' | 'pre-register';
  email: string;
  role: CompanyRole;
  name?: string;
  phone?: string | null;
  age?: number | null;
}

@Component({
  selector: 'app-invite-member-dialog',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    TextInputComponent,
    IntegerInputComponent,
    SelectInputComponent,
    DialogShellComponent,
    SteppedPanelLayoutComponent,
    MatProgressSpinner,
  ],
  templateUrl: './invite-member-dialog.component.html',
  styleUrl: './invite-member-dialog.component.scss',
})
export class InviteMemberDialogComponent {
  private dialogRef = inject(MatDialogRef<InviteMemberDialogComponent>);
  protected data = inject<InviteMemberDialogData>(MAT_DIALOG_DATA);
  private translationService = inject(TranslationService);
  private apiAdapter = inject(ApiAdapterService);
  private companyApi = inject(CompanyManagementApiService);
  private destroyRef = inject(DestroyRef);

  private static readonly DIALOG_WIDTH = 'min(560px, 95vw)';
  private static readonly DIALOG_WIDTH_INFO = 'min(820px, 95vw)';

  readonly currentStep = signal(1);
  readonly infoOpen = signal(false);
  readonly lookupLoading = signal(false);
  readonly lookupResult = signal<PersonInviteLookupOutput | null>(null);
  readonly inviteError = signal<string>('');

  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  readonly roleControl = new FormControl<CompanyRole | null>(null, {
    validators: [Validators.required],
  });

  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100),
      DocumentsValidators.fullName,
    ],
  });

  readonly phoneControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [DocumentsValidators.phoneNumber],
  });
  readonly ageControl = new FormControl<number | null>(null, [
    Validators.min(18),
    Validators.max(120),
  ]);

  readonly roleOptions = computed<SelectOption[]>(() => {
    const actorRole = this.data.companyRole;
    const allRoles: { value: CompanyRole; labelKey: string }[] = [
      { value: 'ADMIN', labelKey: 'workspace.members.role.ADMIN' },
      { value: 'MANAGER', labelKey: 'workspace.members.role.MANAGER' },
      { value: 'MEMBER', labelKey: 'workspace.members.role.MEMBER' },
    ];
    const LEVELS: Record<CompanyRole, number> = { OWNER: 4, ADMIN: 3, MANAGER: 2, MEMBER: 1 };
    const actorLevel = LEVELS[actorRole] ?? 0;
    const allowed = allRoles.filter((r) => LEVELS[r.value] < actorLevel);
    return allowed.map((r) => ({
      value: r.value,
      label: this.translationService.translate(r.labelKey),
    }));
  });

  readonly lookupStatus = computed<PersonInviteLookupStatus | null>(
    () => this.lookupResult()?.status ?? null,
  );

  readonly isAvailable = computed(() => this.lookupStatus() === 'AVAILABLE');
  readonly isNotFound = computed(() => this.lookupStatus() === 'NOT_FOUND');
  readonly isBlocked = computed(
    () => this.lookupStatus() === 'IN_THIS_COMPANY' || this.lookupStatus() === 'IN_ANOTHER_COMPANY',
  );

  readonly canProceed = computed(() => this.isAvailable() || this.isNotFound());

  readonly stepProgressConfig = computed<StepProgressConfig>(() => {
    const step1Valid = this.canProceed();
    return {
      steps: [
        {
          label: this.translationService.translate('workspace.members.inviteDialog.steps.email'),
          ariaLabel: this.translationService.translate(
            'workspace.members.inviteDialog.steps.email',
          ),
          disabled: this.isStepDisabled(1),
          buttonColor: this.getStepButtonColor(1, step1Valid),
        },
        {
          label: this.translationService.translate('workspace.members.inviteDialog.steps.details'),
          ariaLabel: this.translationService.translate(
            'workspace.members.inviteDialog.steps.details',
          ),
          disabled: this.isStepDisabled(2),
          buttonColor: this.getStepButtonColor(2, this.currentStep() === 2),
        },
      ],
    };
  });

  constructor() {
    effect(() => {
      this.dialogRef.updateSize(
        this.infoOpen()
          ? InviteMemberDialogComponent.DIALOG_WIDTH_INFO
          : InviteMemberDialogComponent.DIALOG_WIDTH,
      );
    });

    this.emailControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        tap(() => {
          this.lookupResult.set(null);
          this.inviteError.set('');
          this.currentStep.set(1);
          InputValidators.insertErrorOnControl(this.emailControl, 'availability', null);
        }),
        debounceTime(500),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.lookup());
  }

  private lookup(): void {
    this.emailControl.markAsTouched();
    if (this.emailControl.invalid) return;

    this.lookupLoading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.lookupPersonForInvite(this.data.companyId, this.emailControl.value.trim()),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.lookupLoading.set(false);
          const result = response.data;
          this.lookupResult.set(result);

          if (result.status === 'IN_THIS_COMPANY' || result.status === 'IN_ANOTHER_COMPANY') {
            const key =
              result.status === 'IN_THIS_COMPANY'
                ? 'workspace.members.inviteDialog.blocked.inThisCompany'
                : 'workspace.members.inviteDialog.blocked.inAnotherCompany';
            this.inviteError.set(this.translationService.translate(key));
            InputValidators.insertErrorOnControl(this.emailControl, 'availability', true);
            this.emailControl.markAsTouched();
          }
        },
        onError: () => this.lookupLoading.set(false),
      },
    );
  }

  private isStepDisabled(step: number): boolean {
    return step > this.currentStep() + 1 || (step === this.currentStep() + 1 && !this.canProceed());
  }

  private getStepButtonColor(step: number, isValid: boolean): ButtonColorType {
    if (step < this.currentStep() || isValid || step === this.currentStep()) {
      return 'primary';
    }
    return 'secondary';
  }

  goToStep(step: number): void {
    if (step === 2 && !this.canProceed()) return;
    this.currentStep.set(step);
  }

  nextStep(): void {
    if (!this.canProceed()) return;
    this.currentStep.set(2);
  }

  previousStep(): void {
    this.currentStep.set(1);
  }

  confirmInvite(): void {
    this.roleControl.markAsTouched();
    if (this.roleControl.invalid || !this.roleControl.value) return;

    const result: InviteMemberDialogResult = {
      confirmed: true,
      action: 'invite',
      email: this.emailControl.value.trim(),
      role: this.roleControl.value,
    };
    this.dialogRef.close(result);
  }

  confirmPreRegister(): void {
    this.nameControl.markAsTouched();
    this.phoneControl.markAsTouched();
    this.ageControl.markAsTouched();
    this.roleControl.markAsTouched();

    if (
      this.nameControl.invalid ||
      this.phoneControl.invalid ||
      this.ageControl.invalid ||
      this.roleControl.invalid ||
      !this.roleControl.value
    )
      return;

    const result: InviteMemberDialogResult = {
      confirmed: true,
      action: 'pre-register',
      email: this.emailControl.value.trim(),
      role: this.roleControl.value,
      name: this.nameControl.value.trim(),
      phone: this.phoneControl.value || null,
      age: this.ageControl.value,
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
