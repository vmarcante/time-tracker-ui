export type BorderSide = 'left' | 'right' | 'top' | 'bottom';
export type ButtonColorType =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'success-dark'
  | 'error'
  | 'warning'
  | 'info'
  | 'info-dark'
  | 'outline-success'
  | 'outline-error'
  | 'outline-warning'
  | 'outline-info'
  | 'outline-white'
  | 'transparent'
  | 'white';

export type ButtonSize = {
  small?: boolean;
  medium?: boolean;
  large?: boolean;
  fullWidth?: boolean;
};

export type ButtonIcon = {
  iconOnly?: boolean;
  iconName?: string;
  svgIcon?: boolean;
  color?: string;
  position?: 'left' | 'right';
};

export type ButtonLoadingStyle = 'spinner' | 'gradient' | 'border-flow';
