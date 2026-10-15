import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../../../../shared/components/pagination/pagination.component';
import { ApiAdapterService } from '../../../../../../shared/services/api/api-adapter.service';
import { DialogService } from '../../../../../../shared/services/dialog.service';
import { CompanyManagementApiService } from '../../../../services/company-management.api.service';
import { TeamDetailOutput, TeamSummaryOutput } from '../../../../models/company-management.model';
import { CompanyRole } from '../../../../../auth/models';
import { PageWrapper } from '../../../../../../shared/types';
import {
  TeamDialogComponent,
  TeamDialogResult,
} from '../../../../components/company/team-dialog/team-dialog.component';
import { AuthTokenService } from '../../../../../auth/services/auth-token.service';

@Component({
  selector: 'app-teams-section',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    PaginationComponent,
  ],
  templateUrl: './teams-section.component.html',
  styleUrl: './teams-section.component.scss',
})
export class TeamsSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private dialogService = inject(DialogService);
  private authTokenService = inject(AuthTokenService);

  private router = inject(Router);

  protected get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  protected get companyRole(): CompanyRole | null {
    return this.authTokenService.currentUser()?.companyRole ?? null;
  }

  navigateBack(): void {
    this.router.navigate(['/workspace']);
  }

  readonly teams = signal<TeamSummaryOutput[]>([]);
  readonly page = signal<PageWrapper<TeamSummaryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly saving = signal(false);

  readonly canManage = (): boolean => {
    const role = this.companyRole;
    return role === 'OWNER' || role === 'ADMIN';
  };

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(pageNumber: number): void {
    if (!this.companyId) return;
    this.loading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listTeams(this.companyId, pageNumber, 10),
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

  openDetail(team: TeamSummaryOutput): void {
    this.router.navigate(['/workspace/teams/detail'], {
      state: { teamId: team.id },
    });
  }

  openCreateDialog(): void {
    if (!this.companyId || !this.canManage()) return;
    this.openTeamDialog(null);
  }

  private openTeamDialog(team: TeamDetailOutput | null): void {
    if (!this.companyId) return;
    const companyId = this.companyId;

    this.dialogService.openDialog<TeamDialogComponent, TeamDialogResult>(
      TeamDialogComponent,
      {
        autoAdjustSize: true,
        data: { team },
        closeCallback: (result) => {
          if (!result?.confirmed) return;
          this.saving.set(true);

          const input = { name: result.name, description: result.description };
          const request = this.companyApi.createTeam(companyId, input);

          this.apiAdapter.executeRequest(request, {
            ignoreLoading: true,
            onSuccess: () => {
              this.saving.set(false);
              this.loadPage(this.currentPage());
            },
            onError: () => this.saving.set(false),
          });
        },
      },
    );
  }
}
