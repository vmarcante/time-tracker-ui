import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmationButtonConfiguration, ConfirmationDialogConfiguration } from '../../../types';
import { BaseDialogComponent } from "../base/base-dialog.component";
import { ButtonComponent } from "../../button/button.component";

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  standalone: true,
  imports: [BaseDialogComponent, ButtonComponent],
})
export class ConfirmationDialogComponent {
  buttons: ConfirmationButtonConfiguration[];

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogConfiguration,
  ) {
    this.buttons = this.applyButtons();
  }

  applyButtons(): ConfirmationButtonConfiguration[] {
    if (!this.data?.buttons) {
      return [];
    }

    const confirmationButton = this.data.buttons.confirmation;
    const cancelButton = this.data.buttons.cancel;
    const extraButtons = this.data.buttons.extras || [];

    const buttons: ConfirmationButtonConfiguration[] = [];
    if (cancelButton?.show) {
      buttons.push(cancelButton);
    }

    if (extraButtons.length > 0) {
      const orderedExtra = extraButtons.sort((a, b) => a.order - b.order);
      buttons.push(...orderedExtra.filter((button) => button.show));
    }

    if (confirmationButton?.show) {
      buttons.push(confirmationButton);
    }

    return buttons;
  }

  dismiss(): void {
    const cancelButton = this.data.buttons.cancel;
    if (cancelButton) {
      this.dialogRef.close({ [cancelButton.name]: true });
    }
  }

  onButtonClick(button: ConfirmationButtonConfiguration): void {
    this.dialogRef.close({ [button.name]: true });
  }
}
