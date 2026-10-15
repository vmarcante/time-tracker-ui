import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { InputValue, PageWrapper, SelectOption } from '../../../../shared/types';
import { RecentTimeEntriesComponent } from '../../../main/components/time-entries/recent-entries/recent-time-entries.component';
import { CardTimeEntrieComponent } from '../../../main/components/time-entries/card/card-time-entrie.component';
import { ProjectPickerComponent } from '../../components/project-picker/project-picker.component';
import { TrackerApiService } from '../../services/tracker.api.service';
import { TimerService } from '../../services/timer.service';
import {
  TagOutput,
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
    CardTimeEntrieComponent,
    ProjectPickerComponent,
  ],
  templateUrl: './tracker-entries-page.component.html',
  styleUrl: './tracker-entries-page.component.scss',
})
export class TrackerEntriesPageComponent implements OnInit {
  private trackerApi = inject(TrackerApiService);
  private apiAdapter = inject(ApiAdapterService);
  private translationService = inject(TranslationService);
  private destroyRef = inject(DestroyRef);
  protected timer = inject(TimerService);

  readonly entries = signal<TimeEntrySummaryOutput[]>([]);
  readonly page = signal<PageWrapper<TimeEntrySummaryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly filterProjectId = signal<string | null>(null);
  readonly filterTagIds = signal<ReadonlySet<string>>(new Set());
  readonly userTags = signal<TagOutput[]>([]);

  readonly projectFilterControl = new FormControl<string>('');
  readonly projectOptions = signal<SelectOption[]>([]);

  private startPickerPopover = viewChild<PopoverComponent>('startPicker');

  constructor() {
    effect(() => this.loadFeaturedDetail(this.featuredId()));
  }

  ngOnInit(): void {
    this.timer.init();
    this.loadProjects();
    this.loadTags();
    this.loadPage(1);

    this.timer.entryChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((detail) => this.applyExternalChange(detail));
  }

  private loadProjects(): void {
    const allLabel = this.translationService.translate('tracker.entries.allProjects');
    this.projectOptions.set([{ label: allLabel, value: '' }]);

    this.apiAdapter.executeRequest(this.trackerApi.listEntryProjects(), {
      ignoreLoading: true,
      onSuccess: (response) => {
        const options = response.data.map((project) => ({
          label: project.clientName
            ? `${project.name} · ${project.clientName}`
            : project.name,
          value: project.id,
        }));
        this.projectOptions.update((current) => [...current, ...options]);
      },
    });
  }

  private loadTags(): void {
    this.apiAdapter.executeRequest(this.trackerApi.listTags(), {
      ignoreLoading: true,
      onSuccess: (response) => this.userTags.set(response.data),
    });
  }

  loadPage(pageNumber: number, silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    const projectId = this.filterProjectId();
    const tagIds = [...this.filterTagIds()];
    this.apiAdapter.executeRequest(
      this.trackerApi.listMyEntries(
        {
          ...(projectId ? { projectId } : {}),
          ...(tagIds.length ? { tagIds } : {}),
        },
        pageNumber,
        20,
      ),
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

  isTagFilterSelected(tagId: string): boolean {
    return this.filterTagIds().has(tagId);
  }

  toggleTagFilter(tagId: string): void {
    this.filterTagIds.update((current) => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
    this.loadPage(1);
  }

  onProjectStart(project: ProjectSummaryOutput): void {
    this.startPickerPopover()?.close();
    this.timer.start({ projectId: project.id });
  }

  onEntryChanged(detail: TimeEntryDetailOutput): void {
    this.mergeDetail(detail);
    // A mutação pode mudar a ordem (nova sessão vira a mais recente) —
    // recarrega silencioso pra reordenar igual ao backend, sem skeleton.
    this.loadPage(this.currentPage(), true);
  }

  /** Reage a mudanças emitidas pelo timer global (header ou outras telas). */
  private applyExternalChange(detail: TimeEntryDetailOutput): void {
    if (this.entries().some((entry) => entry.id === detail.id)) {
      this.mergeDetail(detail);
      this.loadPage(this.currentPage(), true);
      return;
    }
    this.loadPage(1);
  }

  /** Mescla o detail retornado pelo backend na linha correspondente da lista. */
  private mergeDetail(detail: TimeEntryDetailOutput): void {
    this.entries.update((list) =>
      list.map((entry) =>
        entry.id === detail.id ? { ...entry, ...this.summaryFromDetail(detail) } : entry,
      ),
    );
    if (this.featuredId() === detail.id) {
      this.featuredDetail.set(detail);
    }
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

  /** Entry vigente (running) ou a mais recente do resultado atual — sai da lista padrão. */
  readonly featuredEntry = computed<TimeEntrySummaryOutput | null>(() => {
    const list = this.entries();
    if (list.length === 0) return null;
    const runningId = this.timer.runningEntryId();
    const runningEntry = runningId ? list.find((entry) => entry.id === runningId) : undefined;
    return runningEntry ?? list[0] ?? null;
  });

  readonly featuredRunning = computed(() => {
    const featured = this.featuredEntry();
    return !!featured && this.timer.runningEntryId() === featured.id;
  });

  private readonly featuredId = computed(() => this.featuredEntry()?.id ?? null);
  readonly featuredDetail = signal<TimeEntryDetailOutput | null>(null);

  readonly featuredMeta = computed(() => {
    const detail = this.featuredDetail();
    if (!detail) return null;
    const hasRunningSession = detail.sessions.some((session) => !session.endTime);
    const nowMs = hasRunningSession ? this.timer.now() : null;
    const seconds = detail.sessions.reduce((total, session) => {
      const startMs = new Date(session.startTime).getTime();
      const endMs = session.endTime ? new Date(session.endTime).getTime() : nowMs;
      if (Number.isNaN(startMs) || endMs === null) return total;
      return total + Math.max(0, Math.floor((endMs - startMs) / 1000));
    }, 0);
    return {
      sessions: detail.sessions.length,
      createdAt: detail.createdAt,
      duration: this.formatDuration(seconds),
    };
  });

  private loadFeaturedDetail(id: string | null): void {
    this.featuredDetail.set(null);
    if (!id) return;
    this.apiAdapter.executeRequest(this.trackerApi.findEntry(id), {
      ignoreLoading: true,
      onSuccess: (response) => {
        if (this.featuredId() === response.data.id) {
          this.featuredDetail.set(response.data);
        }
      },
    });
  }

  private formatDuration(totalSeconds: number): string {
    const pad = (value: number): string => value.toString().padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
  }

  readonly listEntries = computed<TimeEntrySummaryOutput[]>(() => {
    const featured = this.featuredEntry();
    return featured ? this.entries().filter((entry) => entry.id !== featured.id) : [];
  });

  protected readonly empty = computed(() => !this.loading() && this.entries().length === 0);
}
