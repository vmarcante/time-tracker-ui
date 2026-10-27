import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea/textarea-input.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { LanguageService } from '../../../../shared/services/language.service';
import { ToastrService } from '../../../../shared/services/toastr.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { DocumentsValidators } from '../../../../shared/validators/documents.validators';
import { InputValidators } from '../../../../shared/validators/input.validators';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import { CompanyDetailOutput } from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { WorkspaceCompanyService } from '../../services/workspace-company.service';

@Component({
  selector: 'app-company-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    TextInputComponent,
    TextareaInputComponent,
  ],
  templateUrl: './company-page.component.html',
  styleUrl: './company-page.component.scss',
})
export class CompanyPageComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private workspaceCompany = inject(WorkspaceCompanyService);
  private languageService = inject(LanguageService);
  private toastr = inject(ToastrService);
  private translation = inject(TranslationService);
  private destroyRef = inject(DestroyRef);

  readonly company = this.workspaceCompany.company;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly copied = signal(false);
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly canEdit = computed(() => this.authTokenService.currentUser()?.companyRole === 'OWNER');
  readonly displayName = this.workspaceCompany.displayName;
  readonly formattedDocument = computed(() => DocumentsValidators.formatCnpj(this.company()?.document));
  readonly hasTradeName = computed(() => !!this.company()?.tradeName?.trim());

  readonly legalNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });
  readonly tradeNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(200)],
  });
  readonly descriptionControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(1000)],
  });

  readonly form = new FormGroup({
    legalName: this.legalNameControl,
    tradeName: this.tradeNameControl,
    description: this.descriptionControl,
  });

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer);
    });
  }

  ngOnInit(): void {
    const companyId = this.companyId;
    if (!companyId) {
      this.loading.set(false);
      return;
    }
    this.workspaceCompany.load(companyId, () => {
      this.fillForm(this.company());
      this.loading.set(false);
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';
    const locale = this.languageService.language() === 'en' ? 'en-US' : 'pt-BR';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
  }

  reset(): void {
    this.fillForm(this.company());
  }

  copyDocument(): void {
    const document = this.formattedDocument();
    if (!document || !navigator.clipboard) return;
    navigator.clipboard.writeText(document).then(() => {
      this.copied.set(true);
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(false), 1800);
    });
  }

  save(): void {
    const companyId = this.companyId;
    if (!companyId || this.saving() || !this.canEdit()) return;

    if (!InputValidators.formGroupValid(this.form)) return;

    const tradeName = this.tradeNameControl.value.trim();
    const description = this.descriptionControl.value.trim();

    this.saving.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.updateCompany(companyId, {
        legalName: this.legalNameControl.value.trim(),
        tradeName: tradeName.length > 0 ? tradeName : null,
        description: description.length > 0 ? description : null,
      }),
      {
        onSuccess: (response) => {
          this.workspaceCompany.set(response.data);
          this.fillForm(response.data);
          this.saving.set(false);
          this.toastr.successMessage(this.translation.translate('workspace.company.form.saved'));
        },
        onError: () => this.saving.set(false),
      },
    );
  }

  private fillForm(company: CompanyDetailOutput | null): void {
    if (!company) return;
    this.form.reset(
      {
        legalName: company.legalName,
        tradeName: company.tradeName ?? '',
        description: company.description ?? '',
      },
      { emitEvent: false },
    );
  }
}
