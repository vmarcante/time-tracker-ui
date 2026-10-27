import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiAdapterService } from '../../../shared/services/api/api-adapter.service';
import { CompanyManagementApiService } from '../../main/services/company-management.api.service';
import { CompanyDetailOutput } from '../../main/models/company-management.model';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceCompanyService {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);

  readonly company = signal<CompanyDetailOutput | null>(null);
  readonly loading = signal(false);

  readonly displayName = computed(() => {
    const company = this.company();
    return company?.tradeName?.trim() || company?.legalName || '';
  });

  load(companyId: string, onDone?: () => void): void {
    if (this.company()?.id === companyId) {
      onDone?.();
      return;
    }
    this.loading.set(true);
    this.apiAdapter.executeRequest(this.companyApi.getCompany(companyId), {
      ignoreLoading: true,
      showErrorToast: false,
      onSuccess: (response) => {
        this.company.set(response.data);
        this.loading.set(false);
        onDone?.();
      },
      onError: () => {
        this.loading.set(false);
        onDone?.();
      },
    });
  }

  set(company: CompanyDetailOutput): void {
    this.company.set(company);
  }
}
