import { Type } from '@angular/core';

export type MobileMenuTheme = 'authenticated' | 'landing' | 'scrolled';

export interface MobileMenuLink {
  label: string;
  action?: () => void;
  children?: MobileMenuLink[];
  component?: Type<unknown>;
  componentInputs?: Record<string, unknown>;
}

export interface MobileMenuLevel {
  title: string;
  links: MobileMenuLink[];
  component?: Type<unknown>;
  componentInputs?: Record<string, unknown>;
}
