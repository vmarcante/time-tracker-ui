import { Component, inject, Input } from '@angular/core';
import { AuthTokenService } from '../../../../features/auth/services/auth-token.service';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogService } from '../../../services/dialog.service';
import { IconComponent } from '../../icon/icon.component';
import { ResponsiveService } from '../../../services/responsive.service';

@Component({
  selector: 'app-dialog-header',
  imports: [IconComponent],
  templateUrl: './dialog-header.component.html',
  styleUrl: './dialog-header.component.scss',
})
export class DialogHeaderComponent {
  @Input() closeable: boolean = true;
  @Input() closeConfirmation: boolean = false;
  @Input() closeConfirmationMessage?: string;

  protected isAuthenticated = inject(AuthTokenService).isAuthenticated;
  protected isMobileOrTablet = inject(ResponsiveService).isMobileOrTablet;
  private dialogRef = inject(MatDialogRef, { optional: true });
  private dialogService = inject(DialogService);

  protected get headerClasses(): Record<string, boolean> {
    return {
      'dialog-header': true,
      'dialog-header--authenticated': this.isAuthenticated(),
      'dialog-header--landing': !this.isAuthenticated(),
    };
  }

  protected get showCloseButton(): boolean {
    return this.closeable && this.isMobileOrTablet();
  }

  protected closeDialog(): void {
    if (!this.dialogRef) return;

    if (this.closeConfirmation) {
      this.dialogService.openCloseConfirmationDialog(
        this.dialogRef,
        this.closeConfirmationMessage || ''
      );
    } else {
      this.dialogRef.close();
    }
  }
}
