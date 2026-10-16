import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  viewChild,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Input "invisível" para edição inline: exibe o valor como texto e, ao clicar
 * (ou Enter), vira um campo sem borda/fundo no mesmo lugar. Enter ou blur
 * confirmam; Esc cancela. Emite `save` apenas quando o valor muda e é válido.
 */
@Component({
  selector: 'app-inline-input',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inline-input.component.html',
  styleUrl: './inline-input.component.scss',
})
export class InlineInputComponent {
  @Input() value: string = '';
  @Input() placeholder: string = '';
  @Input() editTitle: string = '';
  @Input() maxLength: number | null = null;
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() disabled: boolean = false;

  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  readonly editing = signal(false);
  readonly control = new FormControl<string>('', { nonNullable: true });
  private inputRef = viewChild<ElementRef<HTMLInputElement>>('input');

  protected get interactive(): boolean {
    return !this.disabled && !this.readonly;
  }

  protected startEdit(): void {
    if (!this.interactive || this.editing()) return;
    this.control.setValue(this.value);
    this.editing.set(true);
    setTimeout(() => {
      const input = this.inputRef()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  protected commit(): void {
    if (!this.editing()) return;
    this.editing.set(false);
    const value = this.control.value.trim();
    if (value === this.value || (this.required && !value)) {
      this.cancel.emit();
      return;
    }
    this.save.emit(value);
  }

  protected cancelEdit(): void {
    if (!this.editing()) return;
    this.editing.set(false);
    this.cancel.emit();
  }
}
