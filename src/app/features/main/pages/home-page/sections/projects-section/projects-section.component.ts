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
import {
  ProjectDetailOutput,
  ProjectSummaryOutput,
} from '../../../../models/company-management.model';
import { CompanyRole } from '../../../../../auth/models';
import { PageWrapper } from '../../../../../../shared/types';
import { AuthTokenService } from '../../../../../auth/services/auth-token.service';
import {
  ProjectDialogComponent,
  ProjectDialogResult,
} from '../../../../components/company/project-dialog/project-dialog.component';

@Component({
  selector: 'app-projects-section',
  imports: [CommonModule, TranslatePipe, ButtonComponent, IconComponent, PaginationComponent],
  templateUrl: './projects-section.component.html',
  styleUrl: './projects-section.component.scss',
})
export class ProjectsSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private dialogService = inject(DialogService);
  private authTokenService = inject(AuthTokenService);
  private router = inject(Router);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  private get companyRole(): CompanyRole | null {
    return this.authTokenService.currentUser()?.companyRole ?? null;
  }

  navigateBack(): void {
    this.router.navigate(['/workspace']);
  }

  readonly projects = signal<ProjectSummaryOutput[]>([]);
  readonly page = signal<PageWrapper<ProjectSummaryOutput> | null>(null);
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
    this.apiAdapter.executeRequest(this.companyApi.listProjects(this.companyId, pageNumber, 10), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.page.set(response.data);
        this.projects.set(response.data.content);
        this.currentPage.set(pageNumber);
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });
  }

  openCreateDialog(): void {
    if (!this.companyId || !this.canManage()) return;
    this.openProjectDialog(null);
  }

  openProject(project: ProjectSummaryOutput): void {
    this.router.navigate(['/workspace/projects/edit'], {
      state: { projectId: project.id },
    });
  }

  private async openProjectDialog(project: ProjectDetailOutput | null): Promise<void> {
    const companyId = this.companyId;
    if (!companyId) return;

    try {
      const teamsResponse = await this.apiAdapter.executeRequestWithPromise(
        this.companyApi.listTeamsWithMembers(companyId),
        { ignoreLoading: true },
      );

      this.dialogService.openDialog<ProjectDialogComponent, ProjectDialogResult>(
        ProjectDialogComponent,
        {
          width: 'min(680px, 95vw)',
          panelClass: ['stepped-dialog-panel'],
          data: { project, teams: teamsResponse.data, linkedTeams: [] },
          closeCallback: (result) => {
            if (result?.confirmed) {
              void this.saveProject(companyId, project, result);
            }
          },
        },
      );
    } catch {
      // error already surfaced by the request layer
    }
  }

  private async saveProject(
    companyId: string,
    project: ProjectDetailOutput | null,
    result: ProjectDialogResult,
  ): Promise<void> {
    this.saving.set(true);

    const input = {
      name: result.name,
      clientName: result.clientName,
      description: result.description,
      startDate: result.startDate,
      endDate: result.endDate,
      teams: result.teams,
    };

    try {
      await this.apiAdapter.executeRequestWithPromise(
        this.companyApi.createProject(companyId, input),
        { ignoreLoading: true },
      );

      this.loadPage(this.currentPage());
    } catch {
      // error already surfaced by the request layer
    } finally {
      this.saving.set(false);
    }
  }
}
