import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { ToastrComponent } from '../components/toastr/toastr.component';
import { ToastrAlertData, ToastrAlertSimpleOptions } from '../types/toastr.types';
import { ResponsiveService } from './responsive.service';

const TOASTR_CONFIG = {
  DEFAULT_DURATION: 3000,
  DESKTOP_POSITION: { top: '24px', right: '24px' },
  MOBILE_POSITION: { top: '0', right: '0' },
  MAX_QUEUE_SIZE: 10,
} as const;

@Injectable({ providedIn: 'root' })
export class ToastrService {
  private alertQueue: ToastrAlertData[] = [];
  private isShowingAlert = false;
  private currentAlert: MatDialogRef<ToastrComponent> | null = null;
  private currentAlertData: ToastrAlertData | null = null;
  private batchTotal = 0;

  constructor(
    private matDialog: MatDialog,
    private overlay: Overlay,
    private responsiveService: ResponsiveService,
  ) {}

  public successMessage(message: string, duration?: number): void {
    this.createMessage(message, 'success', duration);
  }

  public warningMessage(message: string, duration?: number): void {
    this.createMessage(message, 'warning', duration);
  }

  public errorMessage(message: string, duration?: number): void {
    this.createMessage(message, 'error', duration);
  }

  public infoMessage(message: string, duration?: number): void {
    this.createMessage(message, 'info', duration);
  }

  private queueAlert(options: ToastrAlertData): void {
    if (this.alertQueue.length >= TOASTR_CONFIG.MAX_QUEUE_SIZE) {
      console.warn('Toastr queue is full. Skipping new alert.');
      return;
    }

    this.batchTotal++;

    options.queueInfo = {
      current: this.batchTotal,
      total: this.batchTotal,
    };

    this.alertQueue.push(options);

    this.updateAlertTotals();

    if (!this.isShowingAlert) {
      this.showNextAlert();
    }
  }

  private updateAlertTotals(): void {
    this.alertQueue.forEach((alert) => {
      if (alert.queueInfo) {
        alert.queueInfo.total = this.batchTotal;
      }
    });

    if (this.currentAlertData && this.currentAlertData.queueInfo) {
      this.currentAlertData.queueInfo.total = this.batchTotal;

      if (this.currentAlert) {
        const instance = this.currentAlert.componentInstance;
        if (instance) {
          instance.alertData = { ...this.currentAlertData };
          instance.updateView();
        }
      }
    }
  }

  private showNextAlert(): void {
    if (this.alertQueue.length === 0 || this.isShowingAlert) {
      return;
    }

    this.isShowingAlert = true;

    const nextAlert = this.alertQueue.shift();
    this.currentAlertData = nextAlert || null;

    const isMobileOrTablet = this.responsiveService.isMobileOrTablet;

    // No celular o aviso fica logo abaixo do cabeçalho, para não esconder avatar, timer e navegação.
    const position = isMobileOrTablet()
      ? { ...TOASTR_CONFIG.MOBILE_POSITION, top: `${this.getHeaderBottom()}px` }
      : TOASTR_CONFIG.DESKTOP_POSITION;

    const panelClass = isMobileOrTablet()
      ? ['toastr-panel', 'alert-mobile-fullwidth']
      : ['toastr-panel'];

    this.currentAlert = this.matDialog.open(ToastrComponent, {
      position,
      hasBackdrop: false,
      panelClass,
      data: nextAlert,
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      width: isMobileOrTablet() ? '100%' : undefined,
      maxWidth: isMobileOrTablet() ? '100vw' : undefined,
      // Em telas de toque o aviso não rouba o foco: isso fecharia o teclado virtual de um campo em edição.
      ...(isMobileOrTablet() ? { autoFocus: false, restoreFocus: false } : {}),
    });

    this.currentAlert.afterClosed().subscribe((clearQueue: boolean) => {
      this.isShowingAlert = false;
      this.currentAlert = null;
      this.currentAlertData = null;
      this.resetBatch();
      if (clearQueue) {
        this.alertQueue = [];
      }
      this.showNextAlert();
    });
  }

  private resetBatch(): void {
    if (this.alertQueue.length === 0 && !this.isShowingAlert) {
      this.batchTotal = 0;
    }
  }

  private getHeaderBottom(): number {
    const header = document.querySelector('.layout-wrapper__header');
    return header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
  }

  private openCustomAlert(options: ToastrAlertData): void {
    if (!options.messageContent?.trim()) {
      return;
    }

    this.queueAlert(options);
  }

  private createMessage(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    duration: number = TOASTR_CONFIG.DEFAULT_DURATION,
  ): void {
    this.openCustomAlert({
      messageContent: message,
      type,
      autoClose: { duration },
    });
  }

  public customMessage(message: string, options: ToastrAlertSimpleOptions): void {
    this.openCustomAlert({
      messageContent: message,
      type: options.type,
      button: options.button,
      autoClose: options.autoClose,
    });
  }

  public clearQueue(): void {
    this.alertQueue = [];
    this.batchTotal = 0;
  }

  public closeCurrentAlert(): void {
    if (this.currentAlert) {
      this.currentAlert.close();
    }
  }

  public getQueueSize(): number {
    return this.alertQueue.length;
  }
}
