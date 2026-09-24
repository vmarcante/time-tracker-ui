import { ButtonColorType } from './button.types';

export interface BaseDialogOptions<R> {
  autoAdjustSize?: boolean;
  width?: string;
  height?: string;
  data?: unknown;
  disableClose?: boolean;
  panelClass?: string[];
  closeCallback: (result?: R) => void;
}

export interface BaseDialogStyleConfiguration {
  maxWidth?: string;
  width?: string;
  maxHeight?: string;
  height?: string;
  autoFocus: boolean;
  disableClose: boolean;
  panelClass?: string[];
}

export interface ConfirmationDialogConfiguration {
  title?: string;
  message?: string;
  buttons: {
    confirmation?: ConfirmationButtonConfiguration;
    cancel?: ConfirmationButtonConfiguration;
    extras?: ConfirmationButtonConfiguration[];
  };
  closeable?: boolean;
}

export interface ConfirmationButtonConfiguration {
  show: boolean;
  order: number;
  name: string;
  text: string;
  color?: ButtonColorType;
}
