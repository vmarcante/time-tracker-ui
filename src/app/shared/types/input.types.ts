export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'integer'
  | 'decimal'
  | 'phone'
  | 'url'
  | 'search'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'date'
  | 'daterange'
  | 'file';

export type InputValue = string | number | boolean | Date | File | File[] | null | undefined;

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  [key: string]: any;
}

export interface RadioOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  [key: string]: any;
}

export interface InputValueChangeEvent<T = InputValue> {
  value: T;
  source: 'user' | 'programmatic';
}

export interface InputErrorMessages {
  required?: string;
  email?: string;
  minlength?: string;
  maxlength?: string;
  min?: string;
  max?: string;
  pattern?: string;
}
