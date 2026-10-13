import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-file-input',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-input.component.html',
  styleUrl: './file-input.component.scss',
})
export class FileInputComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Form control
  @Input() control?: FormControl;

  // UI properties
  @Input() label: string = '';
  @Input() hint: string | null = '';

  // File specific
  @Input() accept: string = '';
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;
  @Input() maxFileSize: number = 10 * 1024 * 1024; // 10MB default
  @Input() maxFiles: number = 5;

  // Accessibility
  @Input() inputId: string = '';

  // Custom error messages
  @Input() errorMessages: Record<string, string> = {};

  private translationService: TranslationService = inject(TranslationService);

  @Output() onValueChange = new EventEmitter<File | File[] | null>();
  @Output() filesSelected = new EventEmitter<File[]>();

  protected selectedFiles: File[] = [];

  private readonly generatedId = `file-input-${Math.random().toString(36).substring(2, 11)}`;

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

  protected onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) {
      this.clearFiles();
      return;
    }

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => this.validateFile(file));

    if (validFiles.length === 0) {
      this.clearFiles();
      return;
    }

    // Limitar número de arquivos
    const filesToAdd = validFiles.slice(0, this.maxFiles);

    if (this.multiple) {
      this.selectedFiles = filesToAdd;
      this.control?.setValue(filesToAdd);
      this.onValueChange.emit(filesToAdd);
    } else {
      const firstFile = filesToAdd[0];
      if (firstFile) {
        this.selectedFiles = [firstFile];
        this.control?.setValue(firstFile);
        this.onValueChange.emit(firstFile);
      }
    }

    this.filesSelected.emit(filesToAdd);
  }

  protected triggerFileInput(): void {
    if (!this.readonly && !this.control?.disabled) {
      this.fileInput.nativeElement.click();
    }
  }

  protected removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);

    if (this.selectedFiles.length === 0) {
      this.clearFiles();
    } else {
      if (this.multiple) {
        this.control?.setValue(this.selectedFiles);
        this.onValueChange.emit(this.selectedFiles);
      } else {
        this.control?.setValue(this.selectedFiles[0]);
        this.onValueChange.emit(this.selectedFiles[0]);
      }
      this.filesSelected.emit(this.selectedFiles);
    }

    // Reset input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  protected clearFiles(): void {
    this.selectedFiles = [];
    this.control?.setValue(null);
    this.onValueChange.emit(null);

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  protected validateFile(file: File): boolean {
    // Validar tamanho
    if (file.size > this.maxFileSize) {
      console.warn(
        `Arquivo ${file.name} excede o tamanho máximo de ${this.formatFileSize(this.maxFileSize)}`,
      );
      return false;
    }

    // Validar tipo (se accept estiver definido)
    if (this.accept) {
      const acceptedTypes = this.accept
        .split(',')
        .map((t) => t.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;

      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return mimeType.startsWith(category + '/');
        }
        return mimeType === type;
      });

      if (!isAccepted) {
        console.warn(`Arquivo ${file.name} não é um tipo aceito`);
        return false;
      }
    }

    return true;
  }

  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  protected getFileInputId(): string {
    return this.inputId || 'file-input';
  }

  protected get hasFiles(): boolean {
    return this.selectedFiles.length > 0;
  }

  protected get canAddMore(): boolean {
    return this.multiple && this.selectedFiles.length < this.maxFiles;
  }
}
