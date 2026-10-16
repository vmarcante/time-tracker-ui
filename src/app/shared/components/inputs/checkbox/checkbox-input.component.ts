import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InputValue } from '../../../types/input.types';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-checkbox-input',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkbox-input.component.html',
  styleUrl: './checkbox-input.component.scss',
})
export class CheckboxInputComponent implements OnChanges, OnDestroy {
  // Form control
  @Input() control?: FormControl;

  // UI properties
  @Input() label: string = '';
  @Input() hint: string | null = '';
  @Input() required: boolean = false;

  // Checkbox specific
  @Input() readonly: boolean = false;
  @Input() indeterminate: boolean = false;

  // Accessibility
  @Input() inputId: string = '';

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};

  private translationService: TranslationService = inject(TranslationService);

  @Output() onValueChange = new EventEmitter<InputValue>();

  protected readonly checked = signal(false);
  private controlSubscription?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control']) {
      this.controlSubscription?.unsubscribe();
      this.checked.set(this.control?.value === true);
      this.controlSubscription = this.control?.valueChanges.subscribe((value) =>
        this.checked.set(value === true),
      );
    }
  }

  ngOnDestroy(): void {
    this.controlSubscription?.unsubscribe();
  }

  private readonly generatedId = `checkbox-input-${Math.random().toString(36).substring(2, 11)}`;

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

  protected onChange(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.control?.setValue(value);
    this.onValueChange.emit(value);
  }
}
