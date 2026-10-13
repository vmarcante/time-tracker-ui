import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputValue } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-toggle-input',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './toggle-input.component.html',
  styleUrl: './toggle-input.component.scss',
})
export class ToggleInputComponent {
  // Form control
  @Input() control?: FormControl;
  @Input() formGroup?: FormGroup;
  @Input() controlName?: string;

  // UI properties
  @Input() label: string = '';
  @Input() hint: string | null = '';
  @Input() required: boolean = false;
  @Input() hideHint: boolean = false;
  @Input() hideError: boolean = false;

  // Toggle specific
  @Input() readonly: boolean = false;
  @Input() compact: boolean = false;

  // Accessibility
  @Input() inputId: string = '';

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};

  private translationService: TranslationService = inject(TranslationService);

  protected get effectiveControl(): FormControl | undefined {
    if (this.control) {
      return this.control;
    }

    if (this.formGroup && this.controlName) {
      return this.formGroup.get(this.controlName) as FormControl;
    }

    return undefined;
  }

  @Output() onValueChange = new EventEmitter<InputValue>();

  private readonly generatedId = `toggle-input-${Math.random().toString(36).substring(2, 11)}`;

  protected get generatedInputId(): string {
    return this.inputId || this.generatedId;
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

  protected get wrapperClasses(): Record<string, boolean> {
    return {
      'toggle-wrapper': true,
      'toggle-wrapper--compact': this.compact,
    };
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

    return '';
  }

  protected onChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.checked;
    this.effectiveControl?.setValue(value);
    this.onValueChange.emit(value);
  }
}
