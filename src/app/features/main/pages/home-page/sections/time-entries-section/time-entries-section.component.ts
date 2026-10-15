import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../../../../shared/components/pagination/pagination.component';
import { ApiAdapterService } from '../../../../../../shared/services/api/api-adapter.service';
import { CompanyManagementApiService } from '../../../../services/company-management.api.service';
import { CompanyTimeEntryOutput } from '../../../../models/company-management.model';
import { PageWrapper } from '../../../../../../shared/types';
import { AuthTokenService } from '../../../../../auth/services/auth-token.service';

@Component({
  selector: 'app-time-entries-section',
  imports: [CommonModule, TranslatePipe, IconComponent, PaginationComponent],
  templateUrl: './time-entries-section.component.html',
  styleUrl: './time-entries-section.component.scss',
})
export class TimeEntriesSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private router = inject(Router);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  navigateBack(): void {
    this.router.navigate(['/workspace']);
  }

  readonly entries = signal<CompanyTimeEntryOutput[]>([]);
  readonly page = signal<PageWrapper<CompanyTimeEntryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(pageNumber: number): void {
    if (!this.companyId) return;
    this.loading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listCompanyTimeEntries(this.companyId, pageNumber, 10),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.page.set(response.data);
          this.entries.set(response.data.content);
          this.currentPage.set(pageNumber);
          this.loading.set(false);
        },
        onError: () => this.loading.set(false),
      },
    );
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

}
