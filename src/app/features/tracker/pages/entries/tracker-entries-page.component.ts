import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  untracked,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PopoverComponent } from '../../../../shared/components/popover/popover.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select/select-input.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { debounceTime } from 'rxjs';
import {
  DateRange,
  DaterangeInputComponent,
} from '../../../../shared/components/inputs/daterange/daterange-input.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { InputValue, PageWrapper, SelectOption } from '../../../../shared/types';
import { RecentTimeEntriesComponent } from '../../../main/components/time-entries/recent-entries/recent-time-entries.component';
import { CardTimeEntrieComponent } from '../../../main/components/time-entries/card/card-time-entrie.component';
import {
  ProjectPickerComponent,
  ProjectPickerSelection,
} from '../../components/project-picker/project-picker.component';
import { TrackerApiService } from '../../services/tracker.api.service';
import { TimerService } from '../../services/timer.service';
import {
  TagOutput,
  TimeEntryDetailOutput,
  TimeEntrySummaryOutput,
} from '../../models/tracker.model';

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
    DaterangeInputComponent,
    TextInputComponent,
    RecentTimeEntriesComponent,
    CardTimeEntrieComponent,
    ProjectPickerComponent,
  ],
  templateUrl: './tracker-entries-page.component.html',
  styleUrl: './tracker-entries-page.component.scss',
  animations: [
    trigger('featuredSwap', [
      transition(':increment', [
        animate(
          '750ms cubic-bezier(0.22, 1, 0.36, 1)',
          keyframes([
            style({
              transform: 'translateY(24px) scale(0.96)',
              opacity: 0.3,
              'box-shadow': '0 0 0 0 rgb(220 38 38 / 0.45)',
              offset: 0,
            }),
            style({
              transform: 'translateY(0) scale(1)',
              opacity: 1,
              'box-shadow': '0 0 0 10px rgb(220 38 38 / 0.18)',
              offset: 0.7,
            }),
            style({
              transform: 'translateY(0) scale(1)',
              opacity: 1,
              'box-shadow': '0 0 0 18px rgb(220 38 38 / 0)',
              offset: 1,
            }),
          ]),
        ),
      ]),
    ]),
  ],
})
export class TrackerEntriesPageComponent implements OnInit {
  private trackerApi = inject(TrackerApiService);
  private apiAdapter = inject(ApiAdapterService);
  private translationService = inject(TranslationService);
  private destroyRef = inject(DestroyRef);
  protected timer = inject(TimerService);

  readonly entries = signal<TimeEntrySummaryOutput[]>([]);
  /** Entry mais recente GLOBAL — só atualiza em cargas sem filtro ou quando a vigente para. */
  private readonly recentEntryId = signal<string | null>(null);
  private lastRunningId: string | null = null;
  readonly page = signal<PageWrapper<TimeEntrySummaryOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly filterProjectId = signal<string | null>(null);
  readonly filterTagIds = signal<ReadonlySet<string>>(new Set());
  readonly filterFrom = signal<string | null>(null);
  readonly filterTo = signal<string | null>(null);
  readonly userTags = signal<TagOutput[]>([]);

  readonly filterName = signal<string | null>(null);
  readonly nameFilterControl = new FormControl('', { nonNullable: true });
  readonly projectFilterControl = new FormControl<string>('');
  readonly periodGroup = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  readonly projectOptions = signal<SelectOption[]>([]);

  private startPickerPopover = viewChild<PopoverComponent>('startPicker');

  constructor() {
    effect(() => {
      const id = this.featuredId();
      // untracked: chamadas HTTP leem signals (token do interceptor, idioma)
      // sincronamente — sem isso viram dependências do effect e cada refresh
      // de token dispararia a animação + refetch.
      untracked(() => this.loadFeaturedDetail(id));
      if (id) {
        this.featuredAnimTick.update((tick) => tick + 1);
      }
    });
  }

  ngOnInit(): void {
    this.timer.init();
    this.loadProjects();
    this.loadTags();
    this.loadPage(1);

    this.nameFilterControl.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const name = value.trim();
        this.filterName.set(name.length > 0 ? name : null);
        this.loadPage(1);
      });

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
    const name = this.filterName();
    const from = this.filterFrom();
    const to = this.filterTo();
    this.apiAdapter.executeRequest(
      this.trackerApi.listMyEntries(
        {
          ...(projectId ? { projectId } : {}),
          ...(tagIds.length ? { tagIds } : {}),
          ...(name ? { name } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
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
          if (pageNumber === 1 && !this.hasActiveFilters()) {
            this.recentEntryId.set(response.data.content[0]?.id ?? null);
          }
        },
        onError: () => this.loading.set(false),
      },
    );
  }

  onFilterChange(value: InputValue): void {
    this.filterProjectId.set(typeof value === 'string' && value ? value : null);
    this.loadPage(1);
  }

  onPeriodChange(range: DateRange): void {
    this.filterFrom.set(range.start ? range.start.toISOString() : null);
    this.filterTo.set(range.end ? this.endOfDay(range.end).toISOString() : null);
    this.loadPage(1);
  }

  /** O fim do período inclui o dia inteiro selecionado. */
  private endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
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

  onProjectStart(selection: ProjectPickerSelection): void {
    this.startPickerPopover()?.close();
    this.timer.start({
      projectId: selection.project?.id ?? null,
      name: selection.name,
      tagIds: selection.tagIds,
    });
  }

  onEntryChanged(detail: TimeEntryDetailOutput): void {
    // Toda mutação passa pelo TimerService: ele emite entryChanged$ (que o
    // runningNameSync usa pro header) e o subscriber desta página faz
    // merge + reload silencioso pra reordenar.
    this.timer.syncFromDetail(detail);
  }

  /** Reage a mudanças emitidas pelo timer global (header ou outras telas). */
  private applyExternalChange(detail: TimeEntryDetailOutput): void {
    // Uma entry que acabou de parar é a mais recente por definição —
    // mesmo filtrada fora da lista, ela assume o destaque.
    if (detail.running) {
      this.lastRunningId = detail.id;
    } else if (detail.id === this.lastRunningId) {
      this.lastRunningId = null;
      this.recentEntryId.set(detail.id);
    }
    if (this.featuredId() === detail.id) {
      this.featuredDetail.set(detail);
    }
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

  /**
   * Destaque é independente dos filtros: a vigente (running) ou a mais
   * recente global — nunca o primeiro item da lista filtrada.
   */
  private readonly featuredId = computed(
    () => this.timer.runningEntryId() ?? this.recentEntryId(),
  );

  readonly featuredEntry = computed<TimeEntrySummaryOutput | null>(() => {
    const id = this.featuredId();
    if (!id) return null;
    const inList = this.entries().find((entry) => entry.id === id);
    if (inList) return inList;
    // Featured filtrada fora da lista — usa o detail já carregado como summary.
    const detail = this.featuredDetail();
    return detail && detail.id === id ? detail : null;
  });

  readonly featuredRunning = computed(() => {
    const featured = this.featuredEntry();
    return !!featured && this.timer.runningEntryId() === featured.id;
  });

  private readonly hasActiveFilters = computed(
    () =>
      !!this.filterProjectId() ||
      this.filterTagIds().size > 0 ||
      !!this.filterName() ||
      !!this.filterFrom() ||
      !!this.filterTo(),
  );

  readonly featuredDetail = signal<TimeEntryDetailOutput | null>(null);
  /** Incrementa a cada troca de destaque — dispara a animação :increment. */
  readonly featuredAnimTick = signal(0);

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
    const id = this.featuredId();
    return id ? this.entries().filter((entry) => entry.id !== id) : this.entries();
  });

  protected readonly empty = computed(() => !this.loading() && this.entries().length === 0);
}
