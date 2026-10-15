import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
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
import { TeamDetailComponent } from './team-detail/team-detail.component';
import { AuthTokenService } from '../../../../../auth/services/auth-token.service';

@Component({
  selector: 'app-teams-section',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    PaginationComponent,
    TeamDetailComponent,
  ],
  templateUrl: './teams-section.component.html',
  styleUrl: './teams-section.component.scss',
})
export class TeamsSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private dialogService = inject(DialogService);
  private authTokenService = inject(AuthTokenService);

  @Input() companyId: string | null = null;
  @Input() companyRole: CompanyRole | null = null;
  @Output() back = new EventEmitter<void>();

  readonly teams = signal<TeamSummaryOutput[]>([]);
  readonly page = signal<PageWrapper<TeamSummaryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly saving = signal(false);
  readonly editingTeamId = signal<string | null>(null);
  readonly selectedTeam = signal<TeamDetailOutput | null>(null);
  readonly detailLoading = signal(false);
  readonly openingDetailId = signal<string | null>(null);
  readonly currentUserId = signal<string | null>(this.authTokenService.currentUser()?.id ?? null);

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
    if (!this.companyId || this.detailLoading() || this.editingTeamId()) return;

    const companyId = this.companyId;
    this.openingDetailId.set(team.id);
    this.detailLoading.set(true);

    this.apiAdapter.executeRequest(this.companyApi.findTeam(companyId, team.id), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.openingDetailId.set(null);
        this.detailLoading.set(false);
        this.selectedTeam.set(response.data);
      },
      onError: () => {
        this.openingDetailId.set(null);
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.selectedTeam.set(null);
    this.loadPage(this.currentPage());
  }

  openCreateDialog(): void {
    if (!this.companyId || !this.canManage()) return;
    this.openTeamDialog(null);
  }

  openEditDialog(team: TeamSummaryOutput): void {
    if (!this.companyId || !this.canManage() || this.editingTeamId()) return;

    const companyId = this.companyId;
    this.editingTeamId.set(team.id);

    this.apiAdapter.executeRequest(this.companyApi.findTeam(companyId, team.id), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.editingTeamId.set(null);
        this.openTeamDialog(response.data);
      },
      onError: () => this.editingTeamId.set(null),
    });
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
          const request = team
            ? this.companyApi.updateTeam(companyId, team.id, input)
            : this.companyApi.createTeam(companyId, input);

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
