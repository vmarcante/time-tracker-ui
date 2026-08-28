import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeEntry } from '../../../../../shared/types';
import { CardTimeEntrieComponent } from '../card/card-time-entrie.component';

interface EntryGroup {
  date: string;
  entries: TimeEntry[];
}

@Component({
  selector: 'app-recent-time-entries',
  imports: [CommonModule, CardTimeEntrieComponent],
  templateUrl: './recent-time-entries.component.html',
  styleUrl: './recent-time-entries.component.scss',
})
export class RecentTimeEntriesComponent {
  readonly latestEntries = signal<TimeEntry[]>([
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
        { id: '1', start: this.buildDate(8, 0, -3), end: this.buildDate(9, 30, -3) },
        { id: '2', start: this.buildDate(9, 45, -3), end: this.buildDate(11, 0, -3) },
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
        { id: '3', start: this.buildDate(13, 0, -3), end: this.buildDate(14, 0, -3) },
        { id: '4', start: this.buildDate(14, 15, -3), end: this.buildDate(15, 30, -3) },
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
        { id: '5', start: this.buildDate(16, 0, -3), end: this.buildDate(16, 30, -3) },
        { id: '6', start: this.buildDate(16, 30, -3), end: this.buildDate(17, 0, -3) },
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
        { id: '7', start: this.buildDate(9, 0, -2), end: this.buildDate(10, 30, -2) },
        { id: '8', start: this.buildDate(10, 45, -2), end: this.buildDate(12, 0, -2) },
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
        { id: '9', start: this.buildDate(14, 0, -2), end: this.buildDate(15, 0, -2) },
        { id: '10', start: this.buildDate(15, 15, -2), end: this.buildDate(16, 0, -2) },
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
        { id: '11', start: this.buildDate(10, 0, -1), end: this.buildDate(10, 20, -1) },
        { id: '12', start: this.buildDate(10, 25, -1), end: this.buildDate(10, 45, -1) },
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
        { id: '13', start: this.buildDate(11, 0), end: this.buildDate(11, 30) },
        { id: '14', start: this.buildDate(11, 30), end: this.buildDate(12, 0) },
      ],
    },
  ]);

  readonly groupedEntries = computed(() => this.groupByDate(this.latestEntries()));

  private buildDate(hour: number, minute: number, dayOffset: number = 0): string {
    const now = new Date();
    now.setDate(now.getDate() + dayOffset);
    now.setHours(hour, minute, 0, 0);
    return now.toISOString();
  }

  private groupByDate(entries: TimeEntry[]): EntryGroup[] {
    const groups = new Map<string, TimeEntry[]>();

    for (const entry of entries) {
      const key = entry.start.split('T')[0] ?? '';
      const list = groups.get(key) ?? [];
      list.push(entry);
      groups.set(key, list);
    }

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      entries: items,
    }));
  }
}
