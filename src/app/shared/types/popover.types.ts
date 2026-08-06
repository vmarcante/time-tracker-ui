export type PopoverPosition = 'bottom' | 'top' | 'left' | 'right' | 'auto';

export interface PopoverOptions {
  position?: PopoverPosition;
  width?: string;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  showArrow?: boolean;
}
