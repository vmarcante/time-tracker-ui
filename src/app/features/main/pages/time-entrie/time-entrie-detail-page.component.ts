import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TimeEntry, TimeEntrySession } from '../../../../shared/types';
import type { ButtonIcon } from '../../../../shared/types';
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

  readonly entry = signal<TimeEntry | null>(null);
  readonly selectedSession = signal<TimeEntrySession | null>(null);
  readonly isEditingSession = signal<boolean>(false);
  readonly descriptionControl = new FormControl<string>('');

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

      const start = new Date(isoTime);
      const end = new Date(start.getTime() + 5 * 60 * 1000);
      const startTime = start.getTime();
      const endTime = end.getTime();

      const hasOverlap = (current.sessions ?? []).some((session) => {
        const sessionStart = new Date(session.start).getTime();
        const sessionEnd = new Date(session.end).getTime();
        return !Number.isNaN(sessionStart) && !Number.isNaN(sessionEnd) && sessionStart < endTime && sessionEnd > startTime;
      });

      if (hasOverlap) {
        return current;
      }

      return {
        ...current,
        sessions: [
          ...(current.sessions ?? []),
          { start: start.toISOString(), end: end.toISOString() },
        ],
      };
    });
  }

  protected onSessionResize(event: { original: TimeEntrySession; updated: TimeEntrySession }): void {
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
      start: this.buildDate(8, 0, -3),
      end: this.buildDate(11, 0, -3),
      tags: [
        { id: '1', name: 'Frontend' },
        { id: '2', name: 'Design' },
      ],
      sessions: [
        { start: this.buildDate(8, 0, -3), end: this.buildDate(9, 30, -3) },
        { start: this.buildDate(9, 45, -3), end: this.buildDate(11, 0, -3) },
      ],
    },
    {
      id: '2',
      name: 'Button component',
      description: 'Refactor shared button',
      project: { id: '1', name: 'Website redesign', client: { id: '1', name: 'Acme Corp' } },
      start: this.buildDate(13, 0, -3),
      end: this.buildDate(15, 30, -3),
      tags: [{ id: '3', name: 'Refactor' }],
      sessions: [
        { start: this.buildDate(13, 0, -3), end: this.buildDate(14, 0, -3) },
        { start: this.buildDate(14, 15, -3), end: this.buildDate(15, 30, -3) },
      ],
    },
    {
      id: '3',
      name: 'DS review',
      description: 'Review design system tokens',
      project: { id: '2', name: 'Client meeting' },
      start: this.buildDate(16, 0, -3),
      end: this.buildDate(17, 0, -3),
      sessions: [
        { start: this.buildDate(16, 0, -3), end: this.buildDate(16, 30, -3) },
        { start: this.buildDate(16, 30, -3), end: this.buildDate(17, 0, -3) },
      ],
    },
    {
      id: '4',
      name: 'Auth API',
      description: 'Login and token endpoints',
      project: { id: '3', name: 'Backend API', client: { id: '2', name: 'Wayne Enterprises' } },
      start: this.buildDate(9, 0, -2),
      end: this.buildDate(12, 0, -2),
      tags: [
        { id: '4', name: 'Backend' },
        { id: '5', name: 'API' },
      ],
      sessions: [
        { start: this.buildDate(9, 0, -2), end: this.buildDate(10, 30, -2) },
        { start: this.buildDate(10, 45, -2), end: this.buildDate(12, 0, -2) },
      ],
    },
    {
      id: '5',
      name: 'User migration',
      description: 'Migrate users to new schema',
      project: { id: '3', name: 'Backend API', client: { id: '2', name: 'Wayne Enterprises' } },
      start: this.buildDate(14, 0, -2),
      end: this.buildDate(16, 0, -2),
      sessions: [
        { start: this.buildDate(14, 0, -2), end: this.buildDate(15, 0, -2) },
        { start: this.buildDate(15, 15, -2), end: this.buildDate(16, 0, -2) },
      ],
    },
    {
      id: '6',
      name: 'Code review PR42',
      description: 'Review landing changes',
      project: { id: '4', name: 'Code review' },
      start: this.buildDate(10, 0, -1),
      end: this.buildDate(10, 45, -1),
      tags: [{ id: '6', name: 'PR' }],
      sessions: [
        { start: this.buildDate(10, 0, -1), end: this.buildDate(10, 20, -1) },
        { start: this.buildDate(10, 25, -1), end: this.buildDate(10, 45, -1) },
      ],
    },
    {
      id: '7',
      name: 'Sprint retro',
      description: 'Retrospective meeting',
      project: { id: '5', name: 'Sprint planning' },
      start: this.buildDate(11, 0),
      end: this.buildDate(12, 0),
      tags: [{ id: '7', name: 'Meeting' }],
      sessions: [
        { start: this.buildDate(11, 0), end: this.buildDate(11, 30) },
        { start: this.buildDate(11, 30), end: this.buildDate(12, 0) },
      ],
    },
  ];

  private buildDate(hour: number, minute: number, dayOffset: number = 0): string {
    const now = new Date();
    now.setDate(now.getDate() + dayOffset);
    now.setHours(hour, minute, 0, 0);
    return now.toISOString();
  }
}
