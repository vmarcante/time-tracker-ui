import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { TextareaInputComponent } from '../../../../../shared/components/inputs/textarea/textarea-input.component';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';
import { TeamDetailOutput } from '../../../models/company-management.model';

export interface TeamDialogData {
  team: TeamDetailOutput | null;
}

export interface TeamDialogResult {
  confirmed: true;
  name: string;
  description: string | null;
}

@Component({
  selector: 'app-team-dialog',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    TextInputComponent,
    TextareaInputComponent,
    DialogShellComponent,
  ],
  templateUrl: './team-dialog.component.html',
  styleUrl: './team-dialog.component.scss',
})
export class TeamDialogComponent {
  private dialogRef = inject(MatDialogRef<TeamDialogComponent>);
  protected data = inject<TeamDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = computed(() => this.data.team !== null);

  readonly nameControl = new FormControl(this.data.team?.name ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });

  readonly descriptionControl = new FormControl(this.data.team?.description ?? '', {
    nonNullable: true,
  });

  confirm(): void {
    this.nameControl.markAsTouched();
    this.descriptionControl.markAsTouched();

    if (this.nameControl.invalid || this.descriptionControl.invalid) return;

    const description = this.descriptionControl.value.trim();
    const result: TeamDialogResult = {
      confirmed: true,
      name: this.nameControl.value.trim(),
      description: description.length > 0 ? description : null,
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
