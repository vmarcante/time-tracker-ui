import { Component, computed, inject, input, model, output, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepProgressComponent } from '../step-progress/step-progress.component';
import { IconComponent } from '../icon/icon.component';
import { ResponsiveService } from '../../services/responsive.service';
import { StepProgressConfig } from '../../types/step-progress.types';
import { ButtonColorType } from '../../types/button.types';

export interface SteppedPanelContext {
  $implicit: number;
}

@Component({
  selector: 'app-stepped-panel-layout',
  imports: [CommonModule, StepProgressComponent, IconComponent],
  templateUrl: './stepped-panel-layout.component.html',
  styleUrl: './stepped-panel-layout.component.scss',
})
export class SteppedPanelLayoutComponent {
  private responsiveService = inject(ResponsiveService);

  readonly config = input.required<StepProgressConfig>();
  readonly currentStep = input.required<number>();
  readonly panelTemplate = input<TemplateRef<SteppedPanelContext> | null>(null);
  readonly showPanel = input(true);
  readonly showProgress = input(true);
  readonly collapsible = input(false);
  readonly panelWidth = input('38%');
  readonly mobileOrientation = input<'horizontal' | 'vertical'>('vertical');
  readonly collapsedLabel = input('');
  readonly expandLabel = input('');
  readonly collapseLabel = input('');
  readonly stepAriaLabel = input('');
  readonly stepButtonColor = input<ButtonColorType>('primary');
  readonly progressBarColor = input('var(--color-primary)');

  readonly infoOpen = model(false);
  readonly stepClick = output<number>();

  protected readonly orientation = computed<'horizontal' | 'vertical'>(() =>
    this.responsiveService.isMobileOrTablet() ? this.mobileOrientation() : 'vertical',
  );

  protected toggleInfo(): void {
    this.infoOpen.set(!this.infoOpen());
  }

  protected onStepClick(step: number): void {
    this.stepClick.emit(step);
  }
}
