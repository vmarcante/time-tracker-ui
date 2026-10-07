import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { TextareaInputComponent } from '../../../../../shared/components/inputs/textarea/textarea-input.component';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';

export interface RejectMembershipDialogData {
  memberName: string;
}

export interface RejectMembershipDialogResult {
  confirmed: boolean;
  rejectionReason: string | null;
}

@Component({
  selector: 'app-reject-membership-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonComponent,
    TextareaInputComponent,
    DialogShellComponent,
  ],
  templateUrl: './reject-membership-dialog.component.html',
  styleUrl: './reject-membership-dialog.component.scss',
})
export class RejectMembershipDialogComponent {
  private dialogRef = inject(MatDialogRef<RejectMembershipDialogComponent>);
  protected data = inject<RejectMembershipDialogData>(MAT_DIALOG_DATA);

  readonly reasonControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(500)],
  });

  confirm(): void {
    if (this.reasonControl.invalid) {
      this.reasonControl.markAsTouched();
      return;
    }

    const reason = this.reasonControl.value.trim();
    const result: RejectMembershipDialogResult = {
      confirmed: true,
      rejectionReason: reason.length > 0 ? reason : null,
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
