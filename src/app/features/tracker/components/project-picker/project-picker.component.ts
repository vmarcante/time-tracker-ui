import { Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { TrackerApiService } from '../../services/tracker.api.service';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import {
  CreateProjectOutput,
  ProjectSummaryOutput,
} from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';

interface ProjectGroup {
  labelKey: string;
  projects: ProjectSummaryOutput[];
}

@Component({
  selector: 'app-project-picker',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    TextInputComponent,
  ],
  templateUrl: './project-picker.component.html',
  styleUrl: './project-picker.component.scss',
})
export class ProjectPickerComponent implements OnInit {
  private trackerApi = inject(TrackerApiService);
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);

  readonly select = output<ProjectSummaryOutput>();

  readonly groups = signal<ProjectGroup[]>([]);
  readonly loading = signal(true);
  readonly showCreate = signal(false);
  readonly creating = signal(false);

  readonly newProjectName = new FormControl<string>('');
  readonly newClientName = new FormControl<string>('');

  ngOnInit(): void {
    const companyId = this.authTokenService.currentUser()?.companyId ?? null;

    this.apiAdapter.executeRequest(this.trackerApi.listPersonalProjects(), {
      ignoreLoading: true,
      onSuccess: (response) => {
        if (response.data.content.length > 0) {
          this.groups.update((groups) => [
            ...groups,
            { labelKey: 'tracker.projectPicker.personal', projects: response.data.content },
          ]);
        }
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });

    if (companyId) {
      this.apiAdapter.executeRequest(this.companyApi.listMyProjects(companyId), {
        ignoreLoading: true,
        onSuccess: (response) => {
          if (response.data.content.length > 0) {
            this.groups.update((groups) => [
              ...groups,
              { labelKey: 'tracker.projectPicker.company', projects: response.data.content },
            ]);
          }
        },
      });
    }
  }

  onSelect(project: ProjectSummaryOutput): void {
    this.select.emit(project);
  }

  toggleCreate(): void {
    this.showCreate.update((v) => !v);
    this.newProjectName.setValue('');
    this.newClientName.setValue('');
  }

  canCreate(): boolean {
    return (
      (this.newProjectName.value ?? '').trim().length >= 2 &&
      (this.newClientName.value ?? '').trim().length >= 2 &&
      !this.creating()
    );
  }

  createPersonalProject(): void {
    if (!this.canCreate()) {
      return;
    }

    this.creating.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.createPersonalProject({
        name: (this.newProjectName.value ?? '').trim(),
        clientName: (this.newClientName.value ?? '').trim(),
        description: null,
        startDate: null,
        endDate: null,
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.creating.set(false);
          const created = response.data;
          this.select.emit(this.toSummary(created));
        },
        onError: () => this.creating.set(false),
      },
    );
  }

  private toSummary(created: CreateProjectOutput): ProjectSummaryOutput {
    return {
      id: created.id,
      name: created.name,
      clientName: created.clientName,
      status: created.status,
      teamCount: 0,
      memberCount: 0,
    };
  }
}
