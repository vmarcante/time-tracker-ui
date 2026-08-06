import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { InputValue } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-decimal-input',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './decimal-input.component.html',
  styleUrl: './decimal-input.component.scss',
})
export class DecimalInputComponent {
  // Form control
  @Input() formControl?: FormControl;

  // UI properties
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() showLabel: boolean = true;
  @Input() required: boolean = false;

  // Decimal specific
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() step: number = 0.01;
  @Input() decimalPlaces: number = 2;
  @Input() readonly: boolean = false;

  // Accessibility
  @Input() inputId: string = '';
  @Input() debounceTime: number = 0;

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};

  private translationService: TranslationService = inject(TranslationService);

  // Output events
  @Output() onValueChange = new EventEmitter<InputValue>();
  @Output() onFocus = new EventEmitter<FocusEvent>();
  @Output() onBlur = new EventEmitter<FocusEvent>();
  @Output() onFocusOut = new EventEmitter<FocusEvent>();
  @Output() onReset = new EventEmitter<void>();

  protected get generatedInputId(): string {
    return this.inputId || `decimal-input-${Math.random().toString(36).substring(2, 11)}`;
  }

  protected get hasError(): boolean {
    const ctrl = this.formControl;
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  protected get errorId(): string {
    return `${this.generatedInputId}-error`;
  }

  protected get hintId(): string {
    return `${this.generatedInputId}-hint`;
  }

  protected get ariaDescribedBy(): string | null {
    const parts: string[] = [];
    if (this.hasError) {
      parts.push(this.errorId);
    }
    if (this.hint && !this.hasError) {
      parts.push(this.hintId);
    }
    return parts.length > 0 ? parts.join(' ') : null;
  }

  protected get ariaInvalid(): boolean | null {
    return this.hasError ? true : null;
  }

  protected get ariaRequired(): boolean | null {
    return this.required ? true : null;
  }

  protected get errorMessage(): string {
    const ctrl = this.formControl;
    if (!ctrl || !ctrl.errors || !ctrl.touched) {
      return '';
    }

    const errors = ctrl.errors;
    const customMessages = this.errorMessages;

    if (errors['required']) {
      return customMessages['required'] || this.translationService.translate('validation.required');
    }

    if (errors['min']) {
      return customMessages['min'] || this.translationService.translate('validation.min', { value: errors['min'].min });
    }

    if (errors['max']) {
      return customMessages['max'] || this.translationService.translate('validation.max', { value: errors['max'].max });
    }

    return '';
  }

  // Methods
  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value: number | string = target.value;

    if (value !== '') {
      const numValue = parseFloat(value);

      if (!isNaN(numValue)) {
        this.onValueChange.emit(numValue);
      }
    } else {
      this.onValueChange.emit(null);
    }
  }

  protected focus(event: FocusEvent): void {
    this.onFocus.emit(event);
  }

  protected blur(event: FocusEvent): void {
    const target = event.target as HTMLInputElement;

    if (target.value !== '') {
      const numValue = parseFloat(target.value);
      if (!isNaN(numValue)) {
        target.value = numValue.toFixed(this.decimalPlaces);
      }
    }

    this.onBlur.emit(event);
  }

  protected focusOut(event: FocusEvent): void {
    this.onFocusOut.emit(event);
  }

  protected reset(): void {
    this.formControl?.reset();
    this.onReset.emit();
  }
}
