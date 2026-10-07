import { Component, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../../../../shared/components/pagination/pagination.component';
import { ApiAdapterService } from '../../../../../../shared/services/api/api-adapter.service';
import { CompanyManagementApiService } from '../../../../services/company-management.api.service';
import { TeamSummaryOutput } from '../../../../models/company-management.model';
import { PageWrapper } from '../../../../../../shared/types';

@Component({
  selector: 'app-teams-section',
  imports: [CommonModule, TranslatePipe, ButtonComponent, IconComponent, PaginationComponent],
  templateUrl: './teams-section.component.html',
  styleUrl: './teams-section.component.scss',
})
export class TeamsSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);

  @Output() back = new EventEmitter<void>();

  readonly teams = signal<TeamSummaryOutput[]>([]);
  readonly page = signal<PageWrapper<TeamSummaryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(pageNumber: number): void {
    this.loading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listTeams(pageNumber, 10),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.page.set(response.data);
          this.teams.set(response.data.content);
          this.currentPage.set(pageNumber);
          this.loading.set(false);
        },
        onError: () => this.loading.set(false),
      },
    );
  }

}
