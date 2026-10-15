import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import type { ButtonIcon } from '../../../../../shared/types';
import {
  TimeEntryDetailOutput,
  TimeEntrySummaryOutput,
} from '../../../../tracker/models/tracker.model';
import { TimerService } from '../../../../tracker/services/timer.service';

@Component({
  selector: 'app-card-time-entrie',
  imports: [CommonModule, ButtonComponent, TranslatePipe],
  templateUrl: './card-time-entrie.component.html',
  styleUrl: './card-time-entrie.component.scss',
})
export class CardTimeEntrieComponent {
  private router = inject(Router);
  protected timer = inject(TimerService);

  readonly entry = input.required<TimeEntrySummaryOutput>();
  readonly compact = input<boolean>(false);
  readonly showDate = input<boolean>(true);
  readonly entryChanged = output<TimeEntryDetailOutput>();

  readonly isRunning = computed(() => this.timer.runningEntryId() === this.entry().id);
  readonly tags = computed(() => this.entry().tags ?? []);
  readonly visibleTags = computed(() => this.tags().slice(0, 3));
  readonly extraTagsCount = computed(() => Math.max(0, this.tags().length - 3));

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

  protected toggleRunning(): void {
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
