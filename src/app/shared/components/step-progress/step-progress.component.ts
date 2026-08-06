import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';
import { StepProgressConfig, ButtonColorType } from '../../types';

@Component({
  selector: 'app-step-progress',
  imports: [CommonModule, ButtonComponent, ProgressBarComponent],
  templateUrl: './step-progress.component.html',
  styleUrl: './step-progress.component.scss',
})
export class StepProgressComponent {
  @Input() config: StepProgressConfig = { steps: [] };
  @Input() currentStep: number = 1;
  @Input() ariaLabel: string = '';
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() buttonColor: ButtonColorType = 'primary';
  @Input() progressBarColor: string = 'var(--color-primary)';

  @Output() stepClick = new EventEmitter<number>();

  protected get totalSteps(): number {
    return this.config.steps.length;
  }

  protected get progress(): number {
    if (this.totalSteps <= 1) {
      return 0;
    }

    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  }

  protected get containerClasses(): Record<string, boolean> {
    return {
      'step-progress': true,
      'step-progress--vertical': this.orientation === 'vertical',
    };
  }

  protected get progressBarHeight(): string {
    return this.orientation === 'horizontal' ? '2px' : '100%';
  }

  protected get progressBarWidth(): string {
    return this.orientation === 'vertical' ? '2px' : '100%';
  }

  protected isStepDisabled(stepIndex: number): boolean {
    const stepNumber = stepIndex + 1;
    return this.config.steps[stepIndex]?.disabled ?? stepNumber > this.currentStep + 1;
  }

  protected onStepClick(stepIndex: number): void {
    const stepNumber = stepIndex + 1;

    if (stepNumber < 1 || stepNumber > this.totalSteps || stepNumber === this.currentStep) {
      return;
    }

    this.stepClick.emit(stepNumber);
  }
}
