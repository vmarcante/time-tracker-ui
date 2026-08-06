import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { InputValue } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-textarea-input',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './textarea-input.component.html',
  styleUrl: './textarea-input.component.scss',
})
export class TextareaInputComponent {
  // Form control
  @Input() formControl?: FormControl;

  // UI properties
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() showLabel: boolean = true;
  @Input() required: boolean = false;

  // Textarea specific
  @Input() rows: number = 3;
  @Input() maxLength: number | null = null;
  @Input() readonly: boolean = false;
  @Input() showCounter: boolean = true;
  @Input() resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'vertical';

  // Accessibility
  @Input() inputId: string = '';

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};

  private translationService: TranslationService = inject(TranslationService);

  @Output() onValueChange = new EventEmitter<InputValue>();
  @Output() onFocus = new EventEmitter<FocusEvent>();
  @Output() onBlur = new EventEmitter<FocusEvent>();
  @Output() onFocusOut = new EventEmitter<FocusEvent>();
  @Output() onReset = new EventEmitter<void>();

  protected get generatedInputId(): string {
    return this.inputId || `textarea-input-${Math.random().toString(36).substring(2, 11)}`;
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

    if (errors['minlength']) {
      return customMessages['minlength'] || this.translationService.translate('validation.minLength', {
        length: errors['minlength'].requiredLength,
      });
    }

    if (errors['maxlength']) {
      return customMessages['maxlength'] || this.translationService.translate('validation.maxLength', {
        length: errors['maxlength'].requiredLength,
      });
    }

    return '';
  }

  protected get currentLength(): number {
    return this.formControl?.value?.length || 0;
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.onValueChange.emit(target.value || null);
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
    this.formControl?.reset();
    this.onReset.emit();
  }
}
