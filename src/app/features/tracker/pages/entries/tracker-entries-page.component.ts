import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PopoverComponent } from '../../../../shared/components/popover/popover.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select/select-input.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { InputValue, PageWrapper, SelectOption } from '../../../../shared/types';
import { RecentTimeEntriesComponent } from '../../../main/components/time-entries/recent-entries/recent-time-entries.component';
import { ProjectPickerComponent } from '../../components/project-picker/project-picker.component';
import { TrackerApiService } from '../../services/tracker.api.service';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import { TimerService } from '../../services/timer.service';
import {
  TimeEntryDetailOutput,
  TimeEntrySummaryOutput,
} from '../../models/tracker.model';
import { ProjectSummaryOutput } from '../../../main/models/company-management.model';

@Component({
  selector: 'app-tracker-entries-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    PopoverComponent,
    PaginationComponent,
    SelectInputComponent,
    RecentTimeEntriesComponent,
    ProjectPickerComponent,
  ],
  templateUrl: './tracker-entries-page.component.html',
  styleUrl: './tracker-entries-page.component.scss',
})
export class TrackerEntriesPageComponent implements OnInit {
  private trackerApi = inject(TrackerApiService);
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private translationService = inject(TranslationService);
  private authTokenService = inject(AuthTokenService);
  protected timer = inject(TimerService);

  readonly entries = signal<TimeEntrySummaryOutput[]>([]);
  readonly page = signal<PageWrapper<TimeEntrySummaryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly filterProjectId = signal<string | null>(null);

  readonly projectFilterControl = new FormControl<string>('');
  readonly projectOptions = signal<SelectOption[]>([]);

  private startPickerPopover = viewChild<PopoverComponent>('startPicker');

  ngOnInit(): void {
    this.timer.init();
    this.loadProjects();
    this.loadPage(1);
  }

  private loadProjects(): void {
    const allLabel = this.translationService.translate('tracker.entries.allProjects');
    this.projectOptions.set([{ label: allLabel, value: '' }]);

    const companyId = this.authTokenService.currentUser()?.companyId ?? null;

    this.apiAdapter.executeRequest(this.trackerApi.listPersonalProjects(), {
      ignoreLoading: true,
      onSuccess: (response) => this.appendProjectOptions(response.data.content),
    });

    if (companyId) {
      this.apiAdapter.executeRequest(this.companyApi.listMyProjects(companyId), {
        ignoreLoading: true,
        onSuccess: (response) => this.appendProjectOptions(response.data.content),
      });
    }
  }

  private appendProjectOptions(projects: ProjectSummaryOutput[]): void {
    const options = projects.map((project) => ({
      label: project.clientName
        ? `${project.name} · ${project.clientName}`
        : project.name,
      value: project.id,
    }));
    this.projectOptions.update((current) => [...current, ...options]);
  }

  loadPage(pageNumber: number): void {
    this.loading.set(true);
    const projectId = this.filterProjectId();
    this.apiAdapter.executeRequest(
      this.trackerApi.listMyEntries(projectId ? { projectId } : {}, pageNumber, 20),
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

  onFilterChange(value: InputValue): void {
    this.filterProjectId.set(typeof value === 'string' && value ? value : null);
    this.loadPage(1);
  }

  onProjectStart(project: ProjectSummaryOutput): void {
    this.startPickerPopover()?.close();
    this.timer.start({ projectId: project.id }, () => this.loadPage(1));
  }

  onEntryChanged(detail: TimeEntryDetailOutput): void {
    this.mergeDetail(detail);
  }

  /** Mescla o detail retornado pelo backend na linha correspondente da lista. */
  private mergeDetail(detail: TimeEntryDetailOutput): void {
    this.entries.update((list) =>
      list.map((entry) =>
        entry.id === detail.id ? { ...entry, ...this.summaryFromDetail(detail) } : entry,
      ),
    );
  }

  private summaryFromDetail(detail: TimeEntryDetailOutput): TimeEntrySummaryOutput {
    return {
      id: detail.id,
      userId: detail.userId,
      userName: detail.userName,
      name: detail.name,
      description: detail.description,
      projectId: detail.projectId,
      projectName: detail.projectName,
      clientName: detail.clientName,
      startTime: detail.startTime,
      endTime: detail.endTime,
      durationSeconds: detail.durationSeconds,
      running: detail.running,
      tags: detail.tags,
    };
  }

  protected readonly empty = computed(() => !this.loading() && this.entries().length === 0);
}
