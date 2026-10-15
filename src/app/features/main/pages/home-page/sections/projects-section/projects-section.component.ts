import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
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

  @Input() companyId: string | null = null;
  @Input() companyRole: CompanyRole | null = null;
  @Output() back = new EventEmitter<void>();

  readonly projects = signal<ProjectSummaryOutput[]>([]);
  readonly page = signal<PageWrapper<ProjectSummaryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly saving = signal(false);
  readonly editingProjectId = signal<string | null>(null);

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
      this.companyApi.listProjects(this.companyId, pageNumber, 10),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.page.set(response.data);
          this.projects.set(response.data.content);
          this.currentPage.set(pageNumber);
          this.loading.set(false);
        },
        onError: () => this.loading.set(false),
      },
    );
  }

  openCreateDialog(): void {
    if (!this.companyId || !this.canManage()) return;
    this.openProjectDialog(null);
  }

  openEditDialog(project: ProjectSummaryOutput): void {
    if (!this.companyId || !this.canManage() || this.editingProjectId()) return;

    const companyId = this.companyId;
    this.editingProjectId.set(project.id);

    this.apiAdapter.executeRequest(this.companyApi.findProject(companyId, project.id), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.editingProjectId.set(null);
        this.openProjectDialog(response.data);
      },
      onError: () => this.editingProjectId.set(null),
    });
  }

  private openProjectDialog(project: ProjectDetailOutput | null): void {
    if (!this.companyId) return;
    const companyId = this.companyId;

    this.dialogService.openDialog<ProjectDialogComponent, ProjectDialogResult>(
      ProjectDialogComponent,
      {
        autoAdjustSize: true,
        data: { project },
        closeCallback: (result) => {
          if (!result?.confirmed) return;
          this.saving.set(true);

          const input = {
            name: result.name,
            clientName: result.clientName,
            description: result.description,
            startDate: result.startDate,
            endDate: result.endDate,
          };
          const request = project
            ? this.companyApi.updateProject(companyId, project.id, input)
            : this.companyApi.createProject(companyId, input);

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
