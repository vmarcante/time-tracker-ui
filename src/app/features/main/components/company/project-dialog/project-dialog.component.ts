import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { TextareaInputComponent } from '../../../../../shared/components/inputs/textarea/textarea-input.component';
import { DaterangeInputComponent } from '../../../../../shared/components/inputs/daterange/daterange-input.component';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';
import { ProjectDetailOutput } from '../../../models/company-management.model';
import { TranslationService } from '../../../../../shared/services/translation.service';

export interface ProjectDialogData {
  project: ProjectDetailOutput | null;
}

export interface ProjectDialogResult {
  confirmed: true;
  name: string;
  clientName: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatIsoDate(value: unknown): string | null {
  if (!(value instanceof Date) || isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('start')?.value;
  const end = group.get('end')?.value;
  if (start instanceof Date && end instanceof Date && end.getTime() < start.getTime()) {
    return { invalidRange: true };
  }
  return null;
}

@Component({
  selector: 'app-project-dialog',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    TextInputComponent,
    TextareaInputComponent,
    DaterangeInputComponent,
    DialogShellComponent,
  ],
  templateUrl: './project-dialog.component.html',
  styleUrl: './project-dialog.component.scss',
})
export class ProjectDialogComponent {
  private dialogRef = inject(MatDialogRef<ProjectDialogComponent>);
  private translationService = inject(TranslationService);
  protected data = inject<ProjectDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = computed(() => this.data.project !== null);

  readonly nameControl = new FormControl(this.data.project?.name ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });

  readonly clientNameControl = new FormControl(this.data.project?.clientName ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });

  readonly descriptionControl = new FormControl(this.data.project?.description ?? '', {
    nonNullable: true,
  });

  readonly datesGroup = new FormGroup(
    {
      start: new FormControl<Date | null>(parseIsoDate(this.data.project?.startDate)),
      end: new FormControl<Date | null>(parseIsoDate(this.data.project?.endDate)),
    },
    { validators: [dateRangeValidator] },
  );

  readonly dateErrorMessages: Record<string, string> = {
    invalidRange: this.translationService.translate('home.projects.dialog.dates.invalidRange'),
  };

  confirm(): void {
    this.nameControl.markAsTouched();
    this.clientNameControl.markAsTouched();
    this.descriptionControl.markAsTouched();
    this.datesGroup.markAllAsTouched();

    if (
      this.nameControl.invalid ||
      this.clientNameControl.invalid ||
      this.descriptionControl.invalid ||
      this.datesGroup.invalid
    ) {
      return;
    }

    const description = this.descriptionControl.value.trim();
    const result: ProjectDialogResult = {
      confirmed: true,
      name: this.nameControl.value.trim(),
      clientName: this.clientNameControl.value.trim(),
      description: description.length > 0 ? description : null,
      startDate: formatIsoDate(this.datesGroup.get('start')?.value),
      endDate: formatIsoDate(this.datesGroup.get('end')?.value),
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
