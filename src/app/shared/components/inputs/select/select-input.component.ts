import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSelectChange } from '@angular/material/select';
import { InputValue, SelectOption } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'app-select-input',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, IconComponent],
  templateUrl: './select-input.component.html',
  styleUrl: './select-input.component.scss',
})
export class SelectInputComponent {
  // Form control
  @Input() control?: FormControl;

  // UI properties
  @Input() label: string = '';
  @Input() labelIcon: string | null = null;
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() showLabel: boolean = true;
  @Input() required: boolean = false;

  // Select specific
  @Input() options: SelectOption[] = [];
  @Input() optionLabel: string = 'label';
  @Input() optionValue: string = 'value';
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;

  // Accessibility
  @Input() inputId: string = '';

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};
  @Input() hideHint: boolean = false;
  @Input() hideError: boolean = false;

  private translationService: TranslationService = inject(TranslationService);

  @Output() onValueChange = new EventEmitter<InputValue>();
  @Output() onFocus = new EventEmitter<FocusEvent>();
  @Output() onBlur = new EventEmitter<FocusEvent>();
  @Output() onFocusOut = new EventEmitter<FocusEvent>();
  @Output() onReset = new EventEmitter<void>();

  private readonly generatedId = `select-input-${Math.random().toString(36).substring(2, 11)}`;

  protected get generatedInputId(): string {
    return this.inputId || this.generatedId;
  }

  protected get hasError(): boolean {
    const ctrl = this.control;
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

  protected get hideSubscript(): boolean {
    return this.hideHint && this.hideError;
  }

  protected get ariaRequired(): boolean | null {
    return this.required ? true : null;
  }

  protected get errorMessage(): string {
    const ctrl = this.control;
    if (!ctrl || !ctrl.errors || !ctrl.touched) {
      return '';
    }

    const errors = ctrl.errors;
    const customMessages = this.errorMessages;

    if (errors['required']) {
      return customMessages['required'] || this.translationService.translate('validation.required');
    }

    return '';
  }

  protected get displayValue(): string {
    const control = this.control;
    if (!control) return '';

    const value = control.value;
    const opts = this.options;
    const labelKey = this.optionLabel;
    const valueKey = this.optionValue;

    if (value === null || value === undefined) {
      return '';
    }

    if (this.multiple) {
      if (!Array.isArray(value) || value.length === 0) {
        return '';
      }
      const selectedOptions = opts.filter((opt) => value.includes(opt[valueKey]));
      return selectedOptions.map((opt) => opt[labelKey]).join(', ');
    }

    const selectedOption = opts.find((opt) => opt[valueKey] === value);
    return selectedOption ? selectedOption[labelKey] : '';
  }

  protected onChange(event: MatSelectChange): void {
    const value = event.value;
    this.control?.setValue(value);
    this.onValueChange.emit(value as InputValue);
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
    this.control?.reset();
    this.onReset.emit();
  }
}
