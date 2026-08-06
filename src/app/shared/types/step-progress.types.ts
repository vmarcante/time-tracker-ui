import { ButtonColorType } from './button.types';

export interface StepProgressConfig {
  steps: StepProgressItem[];
}

export interface StepProgressItem {
  label: string;
  ariaLabel?: string;
  disabled?: boolean;
  showLabel?: boolean;
  valid?: boolean;
  buttonColor?: ButtonColorType;
}
