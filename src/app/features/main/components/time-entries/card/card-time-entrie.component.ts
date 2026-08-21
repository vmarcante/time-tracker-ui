import { Component, computed, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { TimeEntry } from '../../../../../shared/types';
import type { ButtonIcon } from '../../../../../shared/types';

@Component({
  selector: 'app-card-time-entrie',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './card-time-entrie.component.html',
  styleUrl: './card-time-entrie.component.scss',
})
export class CardTimeEntrieComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  readonly entry = input.required<TimeEntry>();
  readonly compact = input<boolean>(false);
  readonly showDate = input<boolean>(true);
  readonly runningChange = output<boolean>();
  readonly timeChange = output<TimeEntry>();

  readonly isRunning = signal(false);
  readonly elapsed = signal(0);
  readonly formattedElapsed = computed(() => this.formatElapsed(this.elapsed()));
  readonly tags = computed(() => this.entry().tags ?? []);
  readonly visibleTags = computed(() => this.tags().slice(0, 3));
  readonly extraTagsCount = computed(() => Math.max(0, this.tags().length - 3));

  private intervalId?: number;
  private runningStartAt = 0;
  private accumulated = 0;

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
    this.router.navigate(['/entries', this.entry().id], { state: { entry: this.entry() } });
  }

  ngOnInit(): void {
    this.accumulated = this.calculateRecordedElapsed();
    this.elapsed.set(this.accumulated);
  }

  protected toggleRunning(): void {
    const running = !this.isRunning();
    this.isRunning.set(running);

    if (running) {
      this.runningStartAt = Date.now();
      this.intervalId = window.setInterval(() => {
        this.elapsed.set(this.accumulated + Math.floor((Date.now() - this.runningStartAt) / 1000));
      }, 1000);
    } else {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.accumulated = this.elapsed();
      this.emitUpdatedEntry();
    }

    this.runningChange.emit(running);
  }

  ngOnDestroy(): void {
    window.clearInterval(this.intervalId);
  }

  private calculateRecordedElapsed(): number {
    const start = new Date(this.entry().start).getTime();
    const end = new Date(this.entry().end).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return 0;
    }

    return Math.floor((end - start) / 1000);
  }

  private emitUpdatedEntry(): void {
    const end = new Date().toISOString();
    const start = this.entry().start || this.calculateStartFromElapsed(end);

    this.timeChange.emit({
      ...this.entry(),
      start,
      end,
    });
  }

  private calculateStartFromElapsed(end: string): string {
    const endTime = new Date(end).getTime();
    return new Date(endTime - this.elapsed() * 1000).toISOString();
  }

  private formatElapsed(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (value: number): string => value.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
}
