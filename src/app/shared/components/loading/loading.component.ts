import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-loading',
  imports: [CommonModule, MatProgressSpinner],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
  host: {
    '[class.loading--fullscreen]': 'fullscreen',
  },
})
export class LoadingComponent {
  private translationService = inject(TranslationService);

  @Input() diameter: number = 30;
  @Input() label: string = '';
  @Input() spinnerWidth: number = 5;
  @Input() fullscreen: boolean = false;

  protected get effectiveSpinnerWidth(): number {
    const width = this.spinnerWidth;
    return width > 10 ? 10 : width;
  }

  protected get effectiveDiameter(): number {
    return this.fullscreen ? 70 : this.diameter;
  }

  protected get effectiveLabel(): string {
    if (this.label !== '') {
      return this.translationService.translate(this.label);
    }

    if (this.fullscreen) {
      return this.translationService.translate('loading.defaultLabel');
    }

    return '';
  }

  protected get showLabel(): boolean {
    return this.effectiveLabel !== '';
  }
}
