import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { DialogService } from '../../../../shared/services/dialog.service';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import { TeamDetailOutput } from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { CompanyRole } from '../../../auth/models/person.model';
import { TeamDetailComponent } from '../../../main/pages/home-page/sections/teams-section/team-detail/team-detail.component';
import {
  TeamDialogComponent,
  TeamDialogResult,
} from '../../../main/components/company/team-dialog/team-dialog.component';

@Component({
  selector: 'app-team-detail-page',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    TeamDetailComponent,
  ],
  templateUrl: './team-detail-page.component.html',
  styleUrl: './team-detail-page.component.scss',
})
export class TeamDetailPageComponent implements OnInit {
  private router = inject(Router);
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private dialogService = inject(DialogService);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  protected get companyRole(): CompanyRole | null {
    return this.authTokenService.currentUser()?.companyRole ?? null;
  }

  readonly team = signal<TeamDetailOutput | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly currentUserId = signal<string | null>(
    this.authTokenService.currentUser()?.id ?? null,
  );

  ngOnInit(): void {
    const teamId = (history.state as { teamId?: string } | null)?.teamId;
    const companyId = this.companyId;
    if (!teamId || !companyId) {
      this.navigateBack();
      return;
    }
    this.loadTeam(companyId, teamId);
  }

  private loadTeam(companyId: string, teamId: string): void {
    this.loading.set(true);
    this.apiAdapter.executeRequest(this.companyApi.findTeam(companyId, teamId), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.team.set(response.data);
        this.loading.set(false);
        this.notFound.set(false);
      },
      onError: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  reloadTeam(): void {
    const team = this.team();
    const companyId = this.companyId;
    if (!team || !companyId) return;
    this.loadTeam(companyId, team.id);
  }

  navigateBack(): void {
    this.router.navigate(['/workspace/teams']);
  }

  openEditDialog(): void {
    const team = this.team();
    const companyId = this.companyId;
    if (!team || !companyId) return;

    this.dialogService.openDialog<TeamDialogComponent, TeamDialogResult>(
      TeamDialogComponent,
      {
        autoAdjustSize: true,
        data: { team },
        closeCallback: (result) => {
          if (!result?.confirmed) return;

          this.apiAdapter.executeRequest(
            this.companyApi.updateTeam(companyId, team.id, {
              name: result.name,
              description: result.description,
            }),
            {
              ignoreLoading: true,
              onSuccess: () => this.reloadTeam(),
            },
          );
        },
      },
    );
  }
}
