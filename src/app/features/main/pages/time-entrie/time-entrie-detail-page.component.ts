import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TimeEntry, TimeEntrySession } from '../../../../shared/types';
import type { ButtonIcon } from '../../../../shared/types';
import { DateUtil } from '../../../../shared/utils/date-util';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea/textarea-input.component';
import { TimeEntrieSessionsComponent } from '../../components/time-entries/sessions/time-entrie-sessions.component';

@Component({
  selector: 'app-time-entrie-detail-page',
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, ButtonComponent, TextareaInputComponent, TimeEntrieSessionsComponent],
  templateUrl: './time-entrie-detail-page.component.html',
  styleUrl: './time-entrie-detail-page.component.scss',
})
export class TimeEntrieDetailPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private dateUtil = inject(DateUtil);

  readonly entry = signal<TimeEntry | null>(null);
  readonly selectedSession = signal<TimeEntrySession | null>(null);
  readonly isEditingSession = signal<boolean>(false);
  readonly descriptionControl = new FormControl<string>('');

  readonly sessionDuration = computed<string>(() => {
    const session = this.selectedSession();
    if (!session) {
      return '';
    }
    const totalSeconds = Math.floor(
      (new Date(session.end).getTime() - new Date(session.start).getTime()) / 1000,
    );
    return this.dateUtil.formatDuration(totalSeconds);
  });

  protected readonly backIcon: ButtonIcon = {
    iconName: 'arrows/back',
    iconOnly: true,
    color: 'var(--color-text-secondary)',
  };

  ngOnInit(): void {
    const state = this.router.getCurrentNavigation()?.extras?.state as { entry?: TimeEntry } | undefined;
    const stateEntry = state?.entry;

    if (stateEntry) {
      this.entry.set(stateEntry);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      this.entry.set(this.findMockById(id));
    }
  }

  protected close(): void {
    this.location.back();
  }

  protected onSessionClick(session: TimeEntrySession): void {
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
    if (!selected) {
      return;
    }

    const description = this.descriptionControl.value ?? '';

    this.entry.update((current) => {
      if (!current) {
        return current;
      }

      const updatedSessions = (current.sessions ?? []).map((session) => {
        if (session.start === selected.start && session.end === selected.end) {
          return { ...session, description };
        }
        return session;
      });

      return { ...current, sessions: updatedSessions };
    });

    this.selectedSession.update((s) => (s ? { ...s, description } : null));
    this.isEditingSession.set(false);
  }

  protected onHourClick(isoTime: string): void {
    this.entry.update((current) => {
      if (!current) {
        return current;
      }

      const end = this.dateUtil.addMinutes(isoTime, 5);

      const hasOverlap = (current.sessions ?? []).some((session) => {
        return this.dateUtil.sessionsOverlap(isoTime, end, session.start, session.end);
      });

      if (hasOverlap) {
        return current;
      }

      return {
        ...current,
        sessions: [
          ...(current.sessions ?? []),
          { id: current.id, start: isoTime, end },
        ],
      };
    });
  }

  protected onDayChange(): void {
    this.selectedSession.set(null);
    this.isEditingSession.set(false);
    this.descriptionControl.setValue('');
  }

  protected onSessionResize(event: { original: TimeEntrySession; updated: TimeEntrySession }): void {
    const isSelectedSession =
      this.selectedSession()?.start === event.original.start &&
      this.selectedSession()?.end === event.original.end;

    this.entry.update((current) => {
      if (!current) {
        return current;
      }

      const updatedSessions = (current.sessions ?? []).map((session) => {
        if (session.start === event.original.start && session.end === event.original.end) {
          return event.updated;
        }
        return session;
      });

      return { ...current, sessions: updatedSessions };
    });

    if (isSelectedSession) {
      this.selectedSession.set(event.updated);
      this.descriptionControl.setValue(event.updated.description ?? '');
    }
  }

  private findMockById(id: string | null): TimeEntry | null {
    return this.mocks.find((item) => item.id === id) ?? null;
  }

  private readonly mocks: TimeEntry[] = [
    {
      id: '1',
      name: 'Landing hero',
      description: 'Hero section redesign',
      project: { id: '1', name: 'Website redesign', client: { id: '1', name: 'Acme Corp' } },
      start: this.dateUtil.buildDate(8, 0, -3),
      end: this.dateUtil.buildDate(11, 0, -3),
      tags: [
        { id: '1', name: 'Frontend' },
        { id: '2', name: 'Design' },
      ],
      sessions: [
        { id: '1', start: this.dateUtil.buildDate(8, 0, -3), end: this.dateUtil.buildDate(9, 30, -3) },
        { id: '2', start: this.dateUtil.buildDate(9, 45, -3), end: this.dateUtil.buildDate(11, 0, -3) },
      ],
    },
    {
      id: '2',
      name: 'Button component',
      description: 'Refactor shared button',
      project: { id: '1', name: 'Website redesign', client: { id: '1', name: 'Acme Corp' } },
      start: this.dateUtil.buildDate(13, 0, -3),
      end: this.dateUtil.buildDate(15, 30, -3),
      tags: [{ id: '3', name: 'Refactor' }],
      sessions: [
        { id: '3', start: this.dateUtil.buildDate(13, 0, -3), end: this.dateUtil.buildDate(14, 0, -3) },
        { id: '4', start: this.dateUtil.buildDate(14, 15, -3), end: this.dateUtil.buildDate(15, 30, -3) },
      ],
    },
    {
      id: '3',
      name: 'DS review',
      description: 'Review design system tokens',
      project: { id: '2', name: 'Client meeting' },
      start: this.dateUtil.buildDate(16, 0, -3),
      end: this.dateUtil.buildDate(17, 0, -3),
      sessions: [
        { id: '5', start: this.dateUtil.buildDate(16, 0, -3), end: this.dateUtil.buildDate(16, 30, -3) },
        { id: '6', start: this.dateUtil.buildDate(16, 30, -3), end: this.dateUtil.buildDate(17, 0, -3) },
      ],
    },
    {
      id: '4',
      name: 'Auth API',
      description: 'Login and token endpoints',
      project: { id: '3', name: 'Backend API', client: { id: '2', name: 'Wayne Enterprises' } },
      start: this.dateUtil.buildDate(9, 0, -2),
      end: this.dateUtil.buildDate(12, 0, -2),
      tags: [
        { id: '4', name: 'Backend' },
        { id: '5', name: 'API' },
      ],
      sessions: [
        { id: '7', start: this.dateUtil.buildDate(9, 0, -2), end: this.dateUtil.buildDate(10, 30, -2) },
        { id: '8', start: this.dateUtil.buildDate(10, 45, -2), end: this.dateUtil.buildDate(12, 0, -2) },
      ],
    },
    {
      id: '5',
      name: 'User migration',
      description: 'Migrate users to new schema',
      project: { id: '3', name: 'Backend API', client: { id: '2', name: 'Wayne Enterprises' } },
      start: this.dateUtil.buildDate(14, 0, -2),
      end: this.dateUtil.buildDate(16, 0, -2),
      sessions: [
        { id: '9', start: this.dateUtil.buildDate(14, 0, -2), end: this.dateUtil.buildDate(15, 0, -2) },
        { id: '10', start: this.dateUtil.buildDate(15, 15, -2), end: this.dateUtil.buildDate(16, 0, -2) },
      ],
    },
    {
      id: '6',
      name: 'Code review PR42',
      description: 'Review landing changes',
      project: { id: '4', name: 'Code review' },
      start: this.dateUtil.buildDate(10, 0, -1),
      end: this.dateUtil.buildDate(10, 45, -1),
      tags: [{ id: '6', name: 'PR' }],
      sessions: [
        { id: '11', start: this.dateUtil.buildDate(10, 0, -1), end: this.dateUtil.buildDate(10, 20, -1) },
        { id: '12', start: this.dateUtil.buildDate(10, 25, -1), end: this.dateUtil.buildDate(10, 45, -1) },
      ],
    },
    {
      id: '7',
      name: 'Sprint retro',
      description: 'Retrospective meeting',
      project: { id: '5', name: 'Sprint planning' },
      start: this.dateUtil.buildDate(11, 0),
      end: this.dateUtil.buildDate(12, 0),
      tags: [{ id: '7', name: 'Meeting' }],
      sessions: [
        { id: '13', start: new Date().toISOString(), end: new Date().toISOString() },
        { id: '14', start: new Date().toISOString(), end: new Date().toISOString() },
      ],
    },
  ];
}
