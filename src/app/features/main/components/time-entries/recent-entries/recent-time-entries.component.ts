import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import {
  TimeEntryDetailOutput,
  TimeEntrySummaryOutput,
} from '../../../../tracker/models/tracker.model';
import { CardTimeEntrieComponent } from '../card/card-time-entrie.component';

interface EntryGroup {
  date: string;
  entries: TimeEntrySummaryOutput[];
}

@Component({
  selector: 'app-recent-time-entries',
  imports: [CommonModule, TranslatePipe, CardTimeEntrieComponent],
  templateUrl: './recent-time-entries.component.html',
  styleUrl: './recent-time-entries.component.scss',
})
export class RecentTimeEntriesComponent {
  readonly entries = input.required<TimeEntrySummaryOutput[]>();
  readonly entryChanged = output<TimeEntryDetailOutput>();

  readonly groupedEntries = computed(() => this.groupByDate(this.entries()));

  private groupByDate(entries: TimeEntrySummaryOutput[]): EntryGroup[] {
    const groups = new Map<string, TimeEntrySummaryOutput[]>();

    for (const entry of entries) {
      const reference = entry.startTime ?? entry.endTime ?? '';
      const key = reference.split('T')[0] ?? '';
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
