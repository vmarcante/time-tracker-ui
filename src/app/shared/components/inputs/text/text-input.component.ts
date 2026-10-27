import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { NgxMaskDirective } from 'ngx-mask';
import { InputValue } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'app-text-input',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
    MatTooltip,
    NgxMaskDirective,
    IconComponent,
  ],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
})
export class TextInputComponent {
  private translationService: TranslationService = inject(TranslationService);

  // Input properties
  @Input() inputType: 'text' | 'email' | 'url' | 'tel' | 'password' = 'text';
  @Input() control?: FormControl;
  @Input() controlName?: string;
  @Input() formGroup?: FormGroup;

  // UI properties
  @Input() label: string = '';
  @Input() labelIcon: string | null = null;
  @Input() placeholder: string = '';
  @Input() hint: string | null = '';
  @Input() labelHint: string | null = null;
  @Input() showLabel: boolean = true;
  @Input() required: boolean = false;

  // Validation properties
  @Input() maxLength: number | null = null;
  @Input() minLength: number | null = null;
  @Input() pattern: string | null = null;
  @Input() mask: string | null = null;
  @Input() readonly: boolean = false;

  // Accessibility
  @Input() inputId: string = '';
  @Input() debounceTime: number = 0;
  @Input() autocomplete: string | null = null;
  @Input() showPasswordToggle: boolean = false;

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};
  @Input() hideHint: boolean = false;
  @Input() hideError: boolean = false;

  // Output events
  @Output() onValueChange = new EventEmitter<InputValue>();
  @Output() onFocus = new EventEmitter<FocusEvent>();
  @Output() onBlur = new EventEmitter<FocusEvent>();
  @Output() onFocusOut = new EventEmitter<FocusEvent>();
  @Output() onReset = new EventEmitter<void>();

  get effectiveControl(): FormControl {
    // Prioriza control direto se foi passado
    if (this.control) {
      return this.control;
    }

    // Fallback para formGroup + controlName
    if (this.formGroup && this.controlName) {
      return this.formGroup.get(this.controlName) as FormControl;
    }

    // Retorna FormControl vazio como último recurso
    return new FormControl();
  }

  private readonly generatedId = `text-input-${Math.random().toString(36).substring(2, 11)}`;

  // Computed properties
  get generatedInputId(): string {
    return this.inputId || this.controlName || this.generatedId;
  }

  get hasError(): boolean {
    const ctrl = this.effectiveControl;
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  get errorId(): string {
    return `${this.generatedInputId}-error`;
  }

  get hintId(): string {
    return `${this.generatedInputId}-hint`;
  }

  get labelHintId(): string {
    return `${this.generatedInputId}-label-hint`;
  }

  get ariaDescribedBy(): string | null {
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

  get fieldClasses(): Record<string, boolean> {
    return {
      'mat-text-input-field': true,
      'mat-text-input-field--no-subscript': this.hideSubscript,
    };
  }

  get ariaInvalid(): boolean | null {
    return this.hasError ? true : null;
  }

  get ariaRequired(): boolean | null {
    return this.required ? true : null;
  }

  get appliedMask(): string | null {
    if (this.mask) {
      return this.mask;
    }

    if (this.inputType === 'tel') {
      return '(00) 0000-0000||(00) 0 0000-0000';
    }

    return null;
  }

  get dropSpecialCharacters(): boolean {
    return true;
  }

  get hideSubscript(): boolean {
    return this.hideHint && this.hideError;
  }

  get errorMessage(): string {
    const ctrl = this.effectiveControl;
    if (!ctrl || !ctrl.errors || !ctrl.touched) {
      return '';
    }

    const errors = ctrl.errors;
    const customMessages = this.errorMessages;

    if (errors['required']) {
      return customMessages['required'] || this.translationService.translate('validation.required');
    }

    if (errors['email']) {
      return (
        customMessages['email'] || this.translationService.translate('validation.invalidEmail')
      );
    }

    if (errors['minlength']) {
      return (
        customMessages['minlength'] ||
        this.translationService.translate('validation.minLength', {
          length: errors['minlength'].requiredLength,
        })
      );
    }

    if (errors['maxlength']) {
      return (
        customMessages['maxlength'] ||
        this.translationService.translate('validation.maxLength', {
          length: errors['maxlength'].requiredLength,
        })
      );
    }

    if (errors['pattern']) {
      return (
        customMessages['pattern'] || this.translationService.translate('validation.invalidFormat')
      );
    }

    if (errors['url']) {
      return customMessages['url'] || this.translationService.translate('validation.invalidUrl');
    }

    if (errors['availability']) {
      return (
        customMessages['availability'] || this.translationService.translate('validation.invalid')
      );
    }

    if (errors['invalidPhone']) {
      return (
        customMessages['invalidPhone'] ||
        this.translationService.translate('validation.invalidPhone')
      );
    }

    if (errors['fullName']) {
      return (
        customMessages['fullName'] ||
        this.translationService.translate(String(errors['fullName']))
      );
    }

    if (errors['cnpj']) {
      return (
        customMessages['cnpj'] || this.translationService.translate('validation.invalidCnpj')
      );
    }

    const customKey = Object.keys(errors).find((key) => customMessages[key]);
    return customKey ? customMessages[customKey]! : '';
  }

  // Methods
  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onValueChange.emit(target.value);
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

  protected focusReset(): void {
    this.effectiveControl?.reset();
    this.onReset.emit();
  }
}
