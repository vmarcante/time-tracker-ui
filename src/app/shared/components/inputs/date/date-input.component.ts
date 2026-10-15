import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { InputValue } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'app-date-input',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltip,
    IconComponent,
  ],
  templateUrl: './date-input.component.html',
  styleUrl: './date-input.component.scss',
})
export class DateInputComponent {
  // Form control
  @Input() control?: FormControl;

  // UI properties
  @Input() label: string = '';
  @Input() labelIcon: string | null = null;
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() labelHint: string | null = null;
  @Input() showLabel: boolean = true;
  @Input() required: boolean = false;

  // Date specific
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() readonly: boolean = false;

  private readonly _defaultMinDate = new Date(1900, 0, 1);
  private readonly _defaultMaxDate = new Date(2099, 11, 31);

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

  private readonly generatedId = `date-input-${Math.random().toString(36).substring(2, 11)}`;

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

  protected get labelHintId(): string {
    return `${this.generatedInputId}-label-hint`;
  }

  protected get ariaDescribedBy(): string | null {
    const parts: string[] = [];
    if (this.labelHint) {
      parts.push(this.labelHintId);
    }
    if (this.hasError) {
      parts.push(this.errorId);
    }
    if (this.hint && !this.hasError) {
      parts.push(this.hintId);
    }
    return parts.length > 0 ? parts.join(' ') : null;
  }

  protected get fieldClasses(): Record<string, boolean> {
    return {
      'mat-date-input-field': true,
      'mat-date-input-field--no-subscript': this.hideSubscript,
    };
  }

  protected get hideSubscript(): boolean {
    return this.hideHint && this.hideError;
  }

  protected get ariaInvalid(): boolean | null {
    return this.hasError ? true : null;
  }

  protected get ariaRequired(): boolean | null {
    return this.required ? true : null;
  }

  protected get effectiveMinDate(): Date {
    return this.minDate ?? this._defaultMinDate;
  }

  protected get effectiveMaxDate(): Date {
    return this.maxDate ?? this._defaultMaxDate;
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

    if (errors['matDatepickerMin']) {
      return customMessages['min'] || this.translationService.translate('validation.min');
    }

    if (errors['matDatepickerMax']) {
      return customMessages['max'] || this.translationService.translate('validation.max');
    }

    if (errors['matDatepickerParse']) {
      return (
        customMessages['parse'] || this.translationService.translate('validation.invalidFormat')
      );
    }

    const customKey = Object.keys(errors).find((key) => customMessages[key] !== undefined);
    if (customKey) {
      return customMessages[customKey]!;
    }

    return '';
  }

  /**
   * Applies dd/mm/yyyy mask to the raw input value.
   * Dispatches a synthetic 'input' event so matDatepicker re-reads the masked value.
   * Limits digits to 8 (ddmmyyyy) — extra digits are silently dropped.
   */
  protected onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').substring(0, 8);

    let masked = digits;
    if (digits.length > 2 && digits.length <= 4) {
      masked = `${digits.substring(0, 2)}/${digits.substring(2)}`;
    } else if (digits.length > 4) {
      masked = `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`;
    }

    if (masked !== input.value) {
      input.value = masked;
      input.dispatchEvent(new Event('input'));
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
}
