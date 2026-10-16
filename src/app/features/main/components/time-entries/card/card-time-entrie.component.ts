import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { InlineInputComponent } from '../../../../../shared/components/inputs/inline/inline-input.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import type { ButtonIcon } from '../../../../../shared/types';
import {
  TimeEntryDetailOutput,
  TimeEntrySummaryOutput,
} from '../../../../tracker/models/tracker.model';
import { TimerService } from '../../../../tracker/services/timer.service';
import { TrackerApiService } from '../../../../tracker/services/tracker.api.service';
import { ApiAdapterService } from '../../../../../shared/services/api/api-adapter.service';

@Component({
  selector: 'app-card-time-entrie',
  imports: [CommonModule, ButtonComponent, TranslatePipe, InlineInputComponent],
  templateUrl: './card-time-entrie.component.html',
  styleUrl: './card-time-entrie.component.scss',
})
export class CardTimeEntrieComponent {
  private router = inject(Router);
  private trackerApi = inject(TrackerApiService);
  private apiAdapter = inject(ApiAdapterService);
  protected timer = inject(TimerService);

  readonly entry = input.required<TimeEntrySummaryOutput>();
  readonly compact = input<boolean>(false);
  readonly showDate = input<boolean>(true);
  readonly entryChanged = output<TimeEntryDetailOutput>();

  readonly isRunning = computed(() => this.timer.runningEntryId() === this.entry().id);
  readonly anotherRunning = computed(() => {
    const runningId = this.timer.runningEntryId();
    return !!runningId && runningId !== this.entry().id;
  });
  readonly tags = computed(() => this.entry().tags ?? []);
  readonly visibleTags = computed(() => this.tags().slice(0, 3));
  readonly extraTagsCount = computed(() => Math.max(0, this.tags().length - 3));

  readonly savingName = signal(false);

  /** Rodando usa o mesmo elapsedSeconds do TimerService — idêntico ao widget do header. */
  readonly elapsed = computed(() =>
    this.isRunning() ? this.timer.elapsedSeconds() : this.entry().durationSeconds,
  );
  readonly formattedElapsed = computed(() => this.formatElapsed(this.elapsed()));

  protected readonly playIcon: ButtonIcon = {
    iconName: 'actions/play',
    iconOnly: true,
    color: 'var(--color-success)',
  };

  protected readonly pauseIcon: ButtonIcon = {
    iconName: 'actions/stop',
    iconOnly: true,
    color: 'var(--color-error)',
  };

  protected readonly detailsIcon: ButtonIcon = {
    iconName: 'actions/more',
    iconOnly: true,
    color: 'var(--color-text-secondary)',
  };

  protected openDetails(): void {
    this.router.navigate(['/tracker/entries', this.entry().id]);
  }

  protected onNameSave(name: string): void {
    if (this.savingName()) return;
    this.savingName.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.updateEntry(this.entry().id, {
        name,
        description: this.entry().description,
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.savingName.set(false);
          this.entryChanged.emit(response.data);
        },
        onError: () => this.savingName.set(false),
      },
    );
  }

  protected toggleRunning(): void {
    if (this.anotherRunning()) {
      return;
    }
    if (this.isRunning()) {
      this.timer.stop((detail) => this.entryChanged.emit(detail));
    } else {
      this.timer.start({ entryId: this.entry().id }, (detail) => this.entryChanged.emit(detail));
    }
  }

  private formatElapsed(totalSeconds: number): string {
    const pad = (value: number): string => value.toString().padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
  }
}
