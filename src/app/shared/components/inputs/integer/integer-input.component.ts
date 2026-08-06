import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { InputValue } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'app-integer-input',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, TranslatePipe, IconComponent],
  templateUrl: './integer-input.component.html',
  styleUrl: './integer-input.component.scss',
})
export class IntegerInputComponent {
  // Form control
  @Input() formControl?: FormControl;
  @Input() formGroup?: FormGroup;
  @Input() controlName?: string;

  // UI properties
  @Input() label: string = '';
  @Input() labelIcon: string | null = null;
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() showLabel: boolean = true;
  @Input() required: boolean = false;

  // Integer specific
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() step: number = 1;
  @Input() readonly: boolean = false;
  @Input() showStepButtons: boolean = true;

  // Accessibility
  @Input() inputId: string = '';
  @Input() debounceTime: number = 0;

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};

  private translationService: TranslationService = inject(TranslationService);

  protected get effectiveControl(): FormControl | undefined {
    if (this.formControl) {
      return this.formControl;
    }

    if (this.formGroup && this.controlName) {
      return this.formGroup.get(this.controlName) as FormControl;
    }

    return undefined;
  }

  // Output events
  @Output() onValueChange = new EventEmitter<InputValue>();
  @Output() onFocus = new EventEmitter<FocusEvent>();
  @Output() onBlur = new EventEmitter<FocusEvent>();
  @Output() onFocusOut = new EventEmitter<FocusEvent>();
  @Output() onReset = new EventEmitter<void>();

  protected get generatedInputId(): string {
    return this.inputId || `integer-input-${Math.random().toString(36).substring(2, 11)}`;
  }

  protected get hasError(): boolean {
    const ctrl = this.effectiveControl;
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  protected get errorId(): string {
    return `${this.generatedInputId}-error`;
  }

  protected get hintId(): string {
    return `${this.generatedInputId}-hint`;
  }

  protected get hasStepButtons(): boolean {
    return this.showStepButtons && !this.readonly;
  }

  protected get wrapperClasses(): Record<string, boolean> {
    return {
      'integer-input-wrapper': true,
      'integer-input-wrapper--with-step-buttons': this.hasStepButtons,
    };
  }

  protected get fieldClasses(): Record<string, boolean> {
    return {
      'mat-integer-input-field': true,
      'mat-integer-input-field--with-step-buttons': this.hasStepButtons,
    };
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
    const ctrl = this.effectiveControl;
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
    let value: number | string = target.value;

    if (value !== '') {
      const numValue = parseFloat(value);

      if (!isNaN(numValue)) {
        value = Math.floor(numValue);
        target.value = value.toString();
        this.onValueChange.emit(value);
      }
    } else {
      this.onValueChange.emit(null);
    }
  }

  protected focus(event: FocusEvent): void {
    this.onFocus.emit(event);
  }

  protected blur(event: FocusEvent): void {
    this.onBlur.emit(event);
  }

  protected focusOut(event: FocusEvent): void {
    this.onFocusOut.emit(event);
  }

  protected reset(): void {
    this.effectiveControl?.reset();
    this.onReset.emit();
  }

  protected increment(): void {
    const control = this.effectiveControl;
    if (!control || control.disabled || this.readonly) {
      return;
    }

    const newValue = this.getNumericValue(control.value) + this.step;
    if (this.max !== null && newValue > this.max) {
      return;
    }

    control.setValue(newValue);
    control.markAsTouched();
    this.onValueChange.emit(newValue);
  }

  protected decrement(): void {
    const control = this.effectiveControl;
    if (!control || control.disabled || this.readonly) {
      return;
    }

    const newValue = this.getNumericValue(control.value) - this.step;
    if (this.min !== null && newValue < this.min) {
      return;
    }

    control.setValue(newValue);
    control.markAsTouched();
    this.onValueChange.emit(newValue);
  }

  protected get canIncrement(): boolean {
    const control = this.effectiveControl;
    if (!control || control.disabled || this.readonly) {
      return false;
    }

    return this.max === null || this.getNumericValue(control.value) + this.step <= this.max;
  }

  protected get canDecrement(): boolean {
    const control = this.effectiveControl;
    if (!control || control.disabled || this.readonly) {
      return false;
    }

    return this.min === null || this.getNumericValue(control.value) - this.step >= this.min;
  }

  private getNumericValue(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return this.min ?? 0;
    }

    const num = Number(value);
    return isNaN(num) ? (this.min ?? 0) : num;
  }
}
