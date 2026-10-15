import { Component, Input, Output, EventEmitter, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslationService } from '../../../../shared/services/translation.service';
import { DateInputComponent } from '../date/date-input.component';
import { IconComponent } from '../../icon/icon.component';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

@Component({
  selector: 'app-daterange-input',
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent, IconComponent],
  templateUrl: './daterange-input.component.html',
  styleUrl: './daterange-input.component.scss',
})
export class DaterangeInputComponent {
  // Form group
  @Input() formGroup!: FormGroup;

  // UI properties
  @Input() label: string = '';
  @Input() labelIcon: string | null = null;
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() required: boolean = false;

  // Date range specific
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() readonly: boolean = false;
  @Input() startLabel: string = 'Início';
  @Input() endLabel: string = 'Fim';
  @Input() separator: string = 'até';

  // Accessibility
  @Input() inputId: string = '';

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};

  private translationService: TranslationService = inject(TranslationService);

  @Output() rangeChange = new EventEmitter<DateRange>();

  constructor() {
    effect(() => {
      const fg = this.formGroup;

      fg.valueChanges.subscribe(() => {
        this.emitRangeChange();
      });
    });
  }

  protected get startControl(): FormControl {
    return this.formGroup.get('start') as FormControl;
  }

  protected get endControl(): FormControl {
    return this.formGroup.get('end') as FormControl;
  }

  // Limites cruzados: o início não pode passar do fim escolhido e vice-versa
  protected get startMaxDate(): Date | null {
    const endValue = this.endControl?.value;
    return endValue instanceof Date ? endValue : this.maxDate;
  }

  protected get endMinDate(): Date | null {
    const startValue = this.startControl?.value;
    return startValue instanceof Date ? startValue : this.minDate;
  }

  private readonly generatedId = `daterange-input-${Math.random().toString(36).substring(2, 11)}`;

  protected get generatedInputId(): string {
    return this.inputId || this.generatedId;
  }

  protected get hasError(): boolean {
    const fg = this.formGroup;
    if (!fg?.invalid) return false;
    return fg.touched || this.startControl?.touched || this.endControl?.touched;
  }

  protected get errorId(): string {
    return `${this.generatedInputId}-error`;
  }

  protected get hintId(): string {
    return `${this.generatedInputId}-hint`;
  }

  protected get errorMessage(): string {
    const fg = this.formGroup;
    if (!fg || !fg.errors || !this.hasError) {
      return '';
    }

    const errors = fg.errors;
    const customMessages = this.errorMessages;

    const customKey = Object.keys(errors).find((key) => customMessages[key] !== undefined);
    if (customKey) {
      return customMessages[customKey]!;
    }

    if (errors['required']) {
      return customMessages['required'] || this.translationService.translate('validation.required');
    }

    return '';
  }

  private emitRangeChange(): void {
    const start = this.startControl?.value;
    const end = this.endControl?.value;

    this.rangeChange.emit({
      start: start instanceof Date ? start : null,
      end: end instanceof Date ? end : null,
    });
  }
}
