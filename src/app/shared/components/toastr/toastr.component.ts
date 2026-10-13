import {
  Component,
  Inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrAlertData } from '../../types/toastr.types';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { IconComponent } from '../icon/icon.component';

type ToastrType = 'success' | 'error' | 'warning' | 'info';

interface IconConfig {
  name: string;
  altMessage: string;
}

const ICONS_CONFIG: Record<ToastrType, IconConfig> = {
  success: {
    name: 'status/check-circle',
    altMessage: 'common.toastr.types.success',
  },
  error: {
    name: 'status/x-circle',
    altMessage: 'common.toastr.types.error',
  },
  warning: {
    name: 'status/alert',
    altMessage: 'common.toastr.types.warning',
  },
  info: {
    name: 'status/info-circle',
    altMessage: 'common.toastr.types.info',
  },
} as const;

@Component({
  selector: 'app-toastr',
  templateUrl: './toastr.component.html',
  styleUrls: ['./toastr.component.scss'],
  imports: [CommonModule, TranslatePipe, IconComponent],
})
export class ToastrComponent implements OnInit, OnDestroy {
  readonly ICONS_CONFIG = ICONS_CONFIG;
  alertData: ToastrAlertData;
  autoDismissEnabled = false;
  hasQueue = false;
  
  private autoCloseTimeout?: number;

  constructor(
    public dialogReference: MatDialogRef<ToastrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ToastrAlertData,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService
  ) {
    this.alertData = data;
    this.hasQueue = this.hasNextAlertInQueue();
  }

  ngOnInit(): void {
    if (this.alertData?.autoClose) {
      this.autoDismissEnabled = true;
      this.autoCloseTimeout = window.setTimeout(() => {
        this.dismissAlert();
      }, this.alertData.autoClose.duration);
    }
  }

  ngOnDestroy(): void {
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
    }
  }

  dismissAlert(clearQueue: boolean = false): void {
    this.dialogReference.close(clearQueue);
  }

  private hasNextAlertInQueue(): boolean {
    if (!this.data?.queueInfo) {
      return false;
    }

    return this.data.queueInfo.current < this.data.queueInfo.total;
  }

  get iconConfig(): IconConfig {
    return ICONS_CONFIG[this.alertData.type];
  }

  get translatedType(): string {
    return this.translationService.translate(this.iconConfig.altMessage);
  }

  get ariaLabel(): string {
    return `${this.translatedType}: ${this.alertData.messageContent}`;
  }

  get closeButtonAriaLabel(): string {
    return this.translationService.translate('common.toastr.actions.close', { type: this.translatedType });
  }

  buttonClickAction(): void {
    if (!this.alertData?.button) {
      this.dismissAlert();
      return;
    }

    this.alertData.button.action();
    this.dismissAlert();
  }

  updateView(): void {
    this.hasQueue = this.hasNextAlertInQueue();
    this.cdr.detectChanges();
  }
}
