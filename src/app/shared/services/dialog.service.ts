import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BaseDialogStyleConfiguration, BaseDialogOptions } from '../types';
import { ResponsiveService } from './responsive.service';
import { ComponentType } from '@angular/cdk/overlay';
import { TranslationService } from './translation.service';
import { ConfirmationDialogComponent } from '../components/dialogs/confirmation/confirmation-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private matDialog = inject(MatDialog);
  private responsiveService = inject(ResponsiveService);
  private translationService = inject(TranslationService);

  private calculateSize(
    isMobile: boolean,
    autoAdjust: boolean,
    customValue?: string,
    defaultValue?: string,
    isHeight = false,
  ): string {
    if (isMobile) {
      return isHeight ? '100dvh' : '100vw';
    }
    if (autoAdjust) {
      return 'auto';
    }
    if (customValue) {
      return customValue;
    }
    return defaultValue ?? 'auto';
  }

  private calculateMaxSize(isMobile: boolean, autoAdjust: boolean): string {
    if (isMobile) {
      return '100vw';
    }
    if (autoAdjust) {
      return 'auto';
    }
    return '90vw';
  }

  private getBaseDialogConfiguration<R>(
    options?: BaseDialogOptions<R>,
  ): BaseDialogStyleConfiguration {
    const isMobile = this.responsiveService.isMobileOrTablet;
    const autoAdjustSize = options?.autoAdjustSize ?? false;

    return {
      width: this.calculateSize(isMobile(), autoAdjustSize, options?.width, '800px'),
      height: this.calculateSize(isMobile(), autoAdjustSize, options?.height, 'auto', true),
      maxWidth: this.calculateMaxSize(isMobile(), autoAdjustSize),
      maxHeight: this.calculateMaxSize(isMobile(), autoAdjustSize),
      autoFocus: false,
      disableClose: false,
      panelClass: isMobile() ? ['fullscreen-mobile-dialog'] : [],
    };
  }

  openDialog<T, R = void>(
    component: ComponentType<T>,
    options?: BaseDialogOptions<R>,
    backdropConfirmation?: boolean,
    confirmationMessage?: string,
  ): MatDialogRef<T, R> {

    if (!confirmationMessage) {
      confirmationMessage = this.translationService.translate('common.dialog.closeConfirmation');
    }

    const baseConfig = this.getBaseDialogConfiguration(options);

    const dialogConfig = {
      ...baseConfig,
      data: options?.data,
      disableClose: options?.disableClose ?? backdropConfirmation ?? false,
      panelClass: [...(baseConfig.panelClass ?? []), ...(options?.panelClass ?? [])],
      backdropClass: options?.backdropClass,
      scrollStrategy: this.matDialog['_scrollStrategy']?.(),
      hasBackdrop: true,
    };

    const dialog = this.matDialog.open(component, dialogConfig);

    if (options?.closeCallback) {
      dialog.afterClosed().subscribe((result) => {
        options?.closeCallback?.(result);
      });
    }

    if (backdropConfirmation) {
      dialog.backdropClick().subscribe(() => {
        this.openCloseConfirmationDialog(dialog, confirmationMessage);
      });

      dialog.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape') {
          this.openCloseConfirmationDialog(dialog, confirmationMessage);
        }
      });
    }

    return dialog;
  }

  openCloseConfirmationDialog<T>(dialogRef: MatDialogRef<T>, message: string): void {

    if (!message) {
      message = this.translationService.translate('common.dialog.closeConfirmation');
    }

    const confirmDialog = this.matDialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translationService.translate('common.dialog.close'),
        message: message || this.translationService.translate('common.dialog.close'),
        closeable: true,
        buttons: {
          cancel: {
            show: true,
            text: this.translationService.translate('common.dialog.cancel'),
            order: 1,
            name: 'cancel',
            color: 'outline-error',
          },
          confirmation: {
            show: true,
            text: this.translationService.translate('common.dialog.confirm'),
            order: 2,
            name: 'confirm',
            color: 'success',
          },
        },
      },
    });

    confirmDialog.afterClosed().subscribe((result) => {
      if (result?.confirm) {
        dialogRef.close();
      }
    });
  }
}
