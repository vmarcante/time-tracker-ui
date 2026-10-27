import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../icon/icon.component';
import { InputValue } from '../../../types/input.types';

@Component({
  selector: 'app-code-input',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './code-input.component.html',
  styleUrl: './code-input.component.scss',
})
export class CodeInputComponent implements OnInit, OnDestroy {
  // Form binding (mesmo padrão dos demais inputs)
  @Input() control?: FormControl;
  @Input() controlName?: string;
  @Input() formGroup?: FormGroup;

  // Config
  @Input() length: number = 6;
  @Input() charPattern: string = '^[A-Za-z0-9]$';
  @Input() uppercase: boolean = true;

  // UI
  @Input() label: string = '';
  @Input() labelIcon: string | null = null;
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() errorMessages: Record<string, string> = {};

  // Outputs
  @Output() completed = new EventEmitter<string>();
  @Output() onValueChange = new EventEmitter<InputValue>();

  @ViewChildren('codeBox') private boxes!: QueryList<ElementRef<HTMLInputElement>>;

  chars: string[] = [];
  focusedIndex = -1;

  private subscription?: Subscription;
  private charRegex = /^[A-Za-z0-9]$/;
  private wasComplete = false;

  get effectiveControl(): FormControl {
    if (this.control) {
      return this.control;
    }
    if (this.formGroup && this.controlName) {
      return this.formGroup.get(this.controlName) as FormControl;
    }
    return new FormControl();
  }

  get errorMessage(): string {
    const control = this.effectiveControl;
    if (!control?.errors || !(control.touched || control.dirty)) {
      return '';
    }

    const [errorKey] = Object.keys(control.errors);
    const custom = errorKey ? this.errorMessages[errorKey] : undefined;
    if (custom) {
      return custom;
    }
    return errorKey === 'pattern' || errorKey === 'minlength'
      ? (this.errorMessages['invalid'] ?? '')
      : '';
  }

  get generatedInputId(): string {
    return this.controlName || `code-input`;
  }

  ngOnInit(): void {
    this.charRegex = new RegExp(this.charPattern);
    this.chars = Array.from({ length: this.length }, () => '');
    this.applyControlValue(this.effectiveControl?.value);

    this.subscription = this.effectiveControl?.valueChanges.subscribe((value) => {
      this.applyControlValue(value);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.slice(-1);
    if (this.uppercase) {
      value = value.toUpperCase();
    }

    if (!this.charRegex.test(value)) {
      input.value = this.chars[index] ?? '';
      return;
    }

    this.chars[index] = value;
    input.value = value;
    this.syncControl();

    if (value && index < this.length - 1) {
      this.focus(index + 1);
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (!this.chars[index] && index > 0) {
        event.preventDefault();
        this.chars[index - 1] = '';
        this.syncControl();
        this.focus(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focus(index - 1);
    } else if (event.key === 'ArrowRight' && index < this.length - 1) {
      event.preventDefault();
      this.focus(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const cleaned = this.uppercase ? text.toUpperCase() : text;
    const valid = cleaned.split('').filter((c) => this.charRegex.test(c)).slice(0, this.length);

    if (valid.length === 0) {
      return;
    }

    for (let i = 0; i < this.length; i++) {
      this.chars[i] = valid[i] ?? '';
    }
    this.syncControl();
    this.focus(Math.min(valid.length, this.length - 1));
  }

  onFocus(index: number): void {
    this.focusedIndex = index;
    const input = this.boxes?.get(index)?.nativeElement;
    input?.select();
  }

  onBlur(): void {
    this.focusedIndex = -1;
  }

  focus(index: number): void {
    this.boxes?.get(index)?.nativeElement.focus();
  }

  private applyControlValue(value: unknown): void {
    const str = typeof value === 'string' ? value : '';
    const cleaned = this.uppercase ? str.toUpperCase() : str;
    const next = Array.from({ length: this.length }, (_, i) =>
      cleaned[i] && this.charRegex.test(cleaned[i]) ? cleaned[i] : '',
    );

    const changed = next.some((c, i) => c !== this.chars[i]);
    if (!changed && this.chars.length > 0) {
      this.wasComplete = next.every((c) => c !== '');
      return;
    }

    this.chars = next;
    this.wasComplete = next.every((c) => c !== '');
  }

  private syncControl(): void {
    const value = this.chars.join('');
    const control = this.effectiveControl;

    if (control && control.value !== value) {
      control.setValue(value);
      control.markAsDirty();
    }

    const isComplete = this.chars.every((c) => c !== '');
    this.onValueChange.emit(value);
    if (isComplete && !this.wasComplete) {
      this.completed.emit(value);
    }
    this.wasComplete = isComplete;
  }
}
