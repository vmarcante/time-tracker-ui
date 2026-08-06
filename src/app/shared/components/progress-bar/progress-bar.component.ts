import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

@Component({
  selector: 'app-progress-bar',
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent implements OnInit, OnDestroy {
  @Input() set progress(value: number) {
    this._progress = value;
    this.progressSubject.next(value);
  }

  @Input() color: string = '#0D3C61';
  @Input() multiColor: boolean = false;
  @Input() label: string = '';
  @Input() labelPosition: 'start' | 'center' | 'end' = 'start';
  @Input() height: string = '8px';
  @Input() width: string = '100%';
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() flat: boolean = false;

  private _progress: number = 0;
  private progressSubject = new BehaviorSubject<number>(0);
  private destroy$ = new Subject<void>();

  private readonly startColor: RgbColor = { r: 233, g: 30, b: 99 };
  private readonly midColor: RgbColor = { r: 251, g: 192, b: 45 };
  private readonly endColor: RgbColor = { r: 53, g: 123, b: 56 };

  currentColor: string = '';

  ngOnInit(): void {
    if (this.multiColor) {
      this.setupColorObserver();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get progress(): number {
    return this._progress;
  }

  protected get wrapperClasses(): Record<string, boolean> {
    return {
      'progress-bar-wrapper': true,
      'progress-bar-wrapper--vertical': this.orientation === 'vertical',
    };
  }

  protected get containerClasses(): Record<string, boolean> {
    return {
      'progress-bar__container': true,
      'progress-bar__container--flat': this.flat,
      'progress-bar__container--vertical': this.orientation === 'vertical',
    };
  }

  protected get containerStyles(): Record<string, string> {
    const isVertical = this.orientation === 'vertical';

    return {
      height: isVertical ? '100%' : this.height,
      width: isVertical ? this.width : '100%',
    };
  }

  protected getProgressBarStyle() {
    const isVertical = this.orientation === 'vertical';

    return {
      [isVertical ? 'height' : 'width']: `${this.progress}%`,
      'background-color': this.multiColor ? this.currentColor : this.color,
    };
  }

  private setupColorObserver(): void {
    this.progressSubject.pipe(takeUntil(this.destroy$)).subscribe((progress) => {
      this.currentColor = this.calculateColor(progress);
    });
  }

  private calculateColor(progress: number): string {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    let r: number;
    let g: number;
    let b: number;

    if (clampedProgress <= 50) {
      const ratio = clampedProgress / 50;
      r = Math.round(this.startColor.r + ratio * (this.midColor.r - this.startColor.r));
      g = Math.round(this.startColor.g + ratio * (this.midColor.g - this.startColor.g));
      b = Math.round(this.startColor.b + ratio * (this.midColor.b - this.startColor.b));
    } else {
      const ratio = (clampedProgress - 50) / 50;
      r = Math.round(this.midColor.r + ratio * (this.endColor.r - this.midColor.r));
      g = Math.round(this.midColor.g + ratio * (this.endColor.g - this.midColor.g));
      b = Math.round(this.midColor.b + ratio * (this.endColor.b - this.midColor.b));
    }

    return `rgba(${r}, ${g}, ${b}, 1)`;
  }
}
