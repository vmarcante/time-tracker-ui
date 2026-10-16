import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import type { ButtonIcon, InputValue } from '../../../../shared/types';
import { DateUtil } from '../../../../shared/utils/date-util';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea/textarea-input.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { InlineInputComponent } from '../../../../shared/components/inputs/inline/inline-input.component';
import { PopoverComponent } from '../../../../shared/components/popover/popover.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ConfirmationDialogComponent } from '../../../../shared/components/dialogs/confirmation/confirmation-dialog.component';
import { DialogService } from '../../../../shared/services/dialog.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { TimeEntrieSessionsComponent } from '../../components/time-entries/sessions/time-entrie-sessions.component';
import {
  ProjectPickerComponent,
  ProjectPickerSelection,
} from '../../../tracker/components/project-picker/project-picker.component';
import { TrackerApiService } from '../../../tracker/services/tracker.api.service';
import { TimerService } from '../../../tracker/services/timer.service';
import {
  SessionView,
  TagOutput,
  TimeEntryDetailOutput,
  toSessionView,
} from '../../../tracker/models/tracker.model';

const DEFAULT_TAG_COLOR = '#6366F1';

const TAG_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#14B8A6',
  '#0EA5E9',
  '#64748B',
];

@Component({
  selector: 'app-time-entrie-detail-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonComponent,
    TextareaInputComponent,
    TextInputComponent,
    InlineInputComponent,
    PopoverComponent,
    IconComponent,
    TimeEntrieSessionsComponent,
    ProjectPickerComponent,
  ],
  templateUrl: './time-entrie-detail-page.component.html',
  styleUrl: './time-entrie-detail-page.component.scss',
})
export class TimeEntrieDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private dateUtil = inject(DateUtil);
  private trackerApi = inject(TrackerApiService);
  private apiAdapter = inject(ApiAdapterService);
  private dialogService = inject(DialogService);
  private translationService = inject(TranslationService);
  protected timer = inject(TimerService);

  readonly entry = signal<TimeEntryDetailOutput | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly saving = signal(false);

  readonly selectedSession = signal<SessionView | null>(null);
  readonly isEditingSession = signal<boolean>(false);
  readonly descriptionControl = new FormControl<string>('');

  readonly allTags = signal<TagOutput[]>([]);
  readonly tagsLoading = signal(false);
  readonly selectedTagIds = signal<Set<string>>(new Set());
  readonly newTagName = new FormControl<string>('');
  readonly tagSearchTerm = signal('');
  readonly newTagColor = signal<string>(DEFAULT_TAG_COLOR);
  readonly tagColors = TAG_COLORS;

  readonly filteredTags = computed<TagOutput[]>(() => {
    const term = this.tagSearchTerm().trim().toLowerCase();
    const tags = this.allTags();
    return term ? tags.filter((tag) => tag.name.toLowerCase().includes(term)) : tags;
  });

  readonly canCreateTag = computed<boolean>(() => {
    const term = this.tagSearchTerm().trim().toLowerCase();
    return term.length > 0 && !this.allTags().some((tag) => tag.name.toLowerCase() === term);
  });

  readonly sessionViews = computed<SessionView[]>(() =>
    (this.entry()?.sessions ?? []).map((session) => toSessionView(session)),
  );

  readonly sessionDuration = computed<string>(() => {
    const session = this.selectedSession();
    if (!session) {
      return '';
    }
    const endMs = session.running ? Date.now() : new Date(session.end).getTime();
    const totalSeconds = Math.floor((endMs - new Date(session.start).getTime()) / 1000);
    return this.dateUtil.formatDuration(Math.max(0, totalSeconds));
  });

  protected readonly backIcon: ButtonIcon = {
    iconName: 'arrows/back',
    iconOnly: true,
    color: 'var(--color-text-secondary)',
  };

  private tagsPopover = viewChild<PopoverComponent>('tagsPopover');

  ngOnInit(): void {
    this.timer.init();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadEntry(id);
  }

  private loadEntry(id: string): void {
    this.loading.set(true);
    this.apiAdapter.executeRequest(this.trackerApi.findEntry(id), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.entry.set(response.data);
        this.timer.syncFromDetail(response.data);
        this.loading.set(false);
      },
      onError: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  /** Mescla um detail retornado pelo backend (mutations retornam o entry completo). */
  private applyDetail(detail: TimeEntryDetailOutput): void {
    this.entry.set(detail);
    this.timer.syncFromDetail(detail);
    const selected = this.selectedSession();
    if (selected) {
      const refreshed = detail.sessions.find((s) => s.id === selected.id);
      this.selectedSession.set(refreshed ? toSessionView(refreshed) : null);
      if (!refreshed) {
        this.isEditingSession.set(false);
      }
    }
  }

  protected close(): void {
    this.location.back();
  }

  private projectPopover = viewChild<PopoverComponent>('projectPopover');

  protected onProjectChange(selection: ProjectPickerSelection): void {
    const entry = this.entry();
    if (!entry || this.saving()) {
      return;
    }
    const project = selection.project;

    this.projectPopover()?.close();
    this.saving.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.updateEntry(entry.id, {
        name: entry.name,
        description: entry.description,
        projectId: project?.id ?? null,
        clearProject: project == null,
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.applyDetail(response.data);
          this.saving.set(false);
        },
        onError: () => this.saving.set(false),
      },
    );
  }

  protected onNameSave(name: string): void {
    const entry = this.entry();
    if (!entry || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.updateEntry(entry.id, {
        name,
        description: entry.description,
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.applyDetail(response.data);
          this.saving.set(false);
        },
        onError: () => this.saving.set(false),
      },
    );
  }

  protected onSessionClick(session: SessionView): void {
    this.selectedSession.set(session);
    this.isEditingSession.set(false);
    this.descriptionControl.setValue(session.description ?? '');
  }

  protected startEditingSession(): void {
    this.isEditingSession.set(true);
  }

  protected closeSessionPanel(): void {
    this.selectedSession.set(null);
    this.isEditingSession.set(false);
    this.descriptionControl.setValue('');
  }

  protected saveSessionDescription(): void {
    const selected = this.selectedSession();
    const entry = this.entry();
    if (!selected || !entry || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.updateSession(entry.id, selected.id, {
        startTime: selected.start,
        endTime: selected.running ? null : selected.end,
        description: this.descriptionControl.value ?? '',
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.applyDetail(response.data);
          this.isEditingSession.set(false);
          this.saving.set(false);
        },
        onError: () => this.saving.set(false),
      },
    );
  }

  protected deleteSession(): void {
    const selected = this.selectedSession();
    const entry = this.entry();
    if (!selected || !entry || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.apiAdapter.executeRequest(this.trackerApi.deleteSession(entry.id, selected.id), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.closeSessionPanel();
        this.applyDetail(response.data);
        this.saving.set(false);
      },
      onError: () => this.saving.set(false),
    });
  }

  protected onHourClick(isoTime: string): void {
    const entry = this.entry();
    if (!entry || this.saving()) {
      return;
    }

    const end = this.dateUtil.addMinutes(isoTime, 15);
    const hasOverlap = entry.sessions.some((session) => {
      const sessionEnd = session.endTime ?? new Date().toISOString();
      return this.dateUtil.sessionsOverlap(isoTime, end, session.startTime, sessionEnd);
    });
    if (hasOverlap) {
      return;
    }

    this.saving.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.createSession(entry.id, { startTime: isoTime, endTime: end }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.applyDetail(response.data);
          this.saving.set(false);
        },
        onError: () => this.saving.set(false),
      },
    );
  }

  protected onDayChange(): void {
    this.selectedSession.set(null);
    this.isEditingSession.set(false);
    this.descriptionControl.setValue('');
  }

  protected onSessionResize(event: { original: SessionView; updated: SessionView }): void {
    const entry = this.entry();
    if (!entry || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.updateSession(entry.id, event.original.id, {
        startTime: event.updated.start,
        endTime: event.original.running ? null : event.updated.end,
        description: event.original.description ?? null,
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.applyDetail(response.data);
          this.saving.set(false);
        },
        onError: () => this.saving.set(false),
      },
    );
  }

  protected confirmDeleteEntry(): void {
    const entry = this.entry();
    if (!entry) {
      return;
    }

    this.dialogService.openDialog<ConfirmationDialogComponent, { confirm?: boolean }>(
      ConfirmationDialogComponent,
      {
        width: '480px',
        data: {
          title: this.translationService.translate('timeEntry.deleteTitle'),
          message: this.translationService.translate('timeEntry.deleteMessage'),
          closeable: true,
          buttons: {
            cancel: {
              show: true,
              text: this.translationService.translate('common.cancel'),
              order: 1,
              name: 'cancel',
              color: 'outline-white',
            },
            confirmation: {
              show: true,
              text: this.translationService.translate('common.delete'),
              order: 2,
              name: 'confirm',
              color: 'error',
            },
          },
        },
        closeCallback: (result) => {
          if (!result?.confirm) return;
          this.apiAdapter.executeRequest(this.trackerApi.deactivateEntry(entry.id), {
            onSuccess: () => this.location.back(),
          });
        },
      },
    );
  }

  protected openTagsPopover(): void {
    this.selectedTagIds.set(new Set((this.entry()?.tags ?? []).map((tag) => tag.id)));
    this.newTagName.setValue('');
    this.tagSearchTerm.set('');
    this.tagsPopover()?.toggle();
    if (this.allTags().length === 0 && !this.tagsLoading()) {
      this.tagsLoading.set(true);
      this.apiAdapter.executeRequest(this.trackerApi.listTags(), {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.allTags.set(response.data);
          this.tagsLoading.set(false);
        },
        onError: () => this.tagsLoading.set(false),
      });
    }
  }

  protected toggleTag(tagId: string): void {
    this.selectedTagIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  protected isTagSelected(tagId: string): boolean {
    return this.selectedTagIds().has(tagId);
  }

  protected onTagSearchChange(value: InputValue): void {
    this.tagSearchTerm.set(value == null ? '' : String(value));
  }

  protected onTagSearchEnter(): void {
    const term = this.tagSearchTerm().trim().toLowerCase();
    if (!term) {
      return;
    }

    const exactMatch = this.allTags().find((tag) => tag.name.toLowerCase() === term);
    if (exactMatch) {
      this.toggleTag(exactMatch.id);
      this.newTagName.setValue('');
      this.tagSearchTerm.set('');
      return;
    }

    this.createTag();
  }

  protected createTag(): void {
    const name = (this.newTagName.value ?? '').trim();
    if (!name || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.apiAdapter.executeRequest(this.trackerApi.createTag({ name, color: this.newTagColor() }), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.allTags.update((tags) => [...tags, response.data]);
        this.toggleTag(response.data.id);
        this.newTagName.setValue('');
        this.tagSearchTerm.set('');
        this.saving.set(false);
        if (!this.tagsPopover()?.isOpen) {
          this.syncTags();
        }
      },
      onError: () => this.saving.set(false),
    });
  }

  protected onTagsPopoverClosed(): void {
    this.syncTags();
  }

  private syncTags(): void {
    const entry = this.entry();
    if (!entry) {
      return;
    }

    const selected = this.selectedTagIds();
    const current = new Set(entry.tags.map((tag) => tag.id));
    const unchanged =
      current.size === selected.size && [...selected].every((id) => current.has(id));
    if (unchanged) {
      return;
    }

    this.saving.set(true);
    this.apiAdapter.executeRequest(this.trackerApi.setEntryTags(entry.id, [...selected]), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.applyDetail(response.data);
        this.saving.set(false);
      },
      onError: () => this.saving.set(false),
    });
  }
}
