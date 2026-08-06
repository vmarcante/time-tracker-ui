import { Component, Input, Output, EventEmitter, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslationService } from '../../../../shared/services/translation.service';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

@Component({
  selector: 'app-daterange-input',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './daterange-input.component.html',
  styleUrl: './daterange-input.component.scss',
})
export class DaterangeInputComponent {
  // Form group
  @Input() formGroup!: FormGroup;

  // UI properties
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() required: boolean = false;

  // Date range specific
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() readonly: boolean = false;

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

  protected get minDateString(): string | null {
    const date = this.minDate;
    return date ? this.formatDateToInput(date) : null;
  }

  protected get maxDateString(): string | null {
    const date = this.maxDate;
    return date ? this.formatDateToInput(date) : null;
  }

  protected get startMinDate(): string | null {
    return this.minDateString;
  }

  protected get startMaxDate(): string | null {
    const endValue = this.formGroup.get('end')?.value;
    if (endValue instanceof Date) {
      return this.formatDateToInput(endValue);
    }
    return this.maxDateString;
  }

  protected get endMinDate(): string | null {
    const startValue = this.formGroup.get('start')?.value;
    if (startValue instanceof Date) {
      return this.formatDateToInput(startValue);
    }
    return this.minDateString;
  }

  protected get endMaxDate(): string | null {
    return this.maxDateString;
  }

  protected onStartChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    if (value) {
      const date = new Date(value);
      this.formGroup.get('start')?.setValue(date);
    } else {
      this.formGroup.get('start')?.setValue(null);
    }
  }

  protected onEndChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    if (value) {
      const date = new Date(value);
      this.formGroup.get('end')?.setValue(date);
    } else {
      this.formGroup.get('end')?.setValue(null);
    }
  }

  private emitRangeChange(): void {
    const start = this.formGroup.get('start')?.value;
    const end = this.formGroup.get('end')?.value;
    
    this.rangeChange.emit({
      start: start instanceof Date ? start : null,
      end: end instanceof Date ? end : null,
    });
  }

  private formatDateToInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected get formattedStartValue(): string {
    const value = this.formGroup.get('start')?.value;
    if (!value) return '';
    
    if (value instanceof Date) {
      return this.formatDateToInput(value);
    }
    
    return '';
  }

  protected get formattedEndValue(): string {
    const value = this.formGroup.get('end')?.value;
    if (!value) return '';
    
    if (value instanceof Date) {
      return this.formatDateToInput(value);
    }
    
    return '';
  }

  protected get generatedInputId(): string {
    return this.inputId || `daterange-input-${Math.random().toString(36).substring(2, 11)}`;
  }

  protected get hasError(): boolean {
    const fg = this.formGroup;
    return fg ? fg.invalid && fg.touched : false;
  }

  protected get errorId(): string {
    return `${this.generatedInputId}-error`;
  }

  protected get hintId(): string {
    return `${this.generatedInputId}-hint`;
  }

  protected get errorMessage(): string {
    const fg = this.formGroup;
    if (!fg || !fg.errors || !fg.touched) {
      return '';
    }

    const errors = fg.errors;
    const customMessages = this.errorMessages;

    if (errors['required']) {
      return customMessages['required'] || this.translationService.translate('validation.required');
    }

    return '';
  }

  protected getStartId(): string {
    return `${this.generatedInputId}-start`;
  }

  protected getEndId(): string {
    return `${this.generatedInputId}-end`;
  }
}
