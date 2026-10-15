import { NativeDateAdapter } from '@angular/material/core';
import { MatDateFormats } from '@angular/material/core';
import { Injectable } from '@angular/core';

/**
 * Parses dd/mm/yyyy and ddmmyyyy strings for pt-BR locale.
 * NativeDateAdapter uses Date.parse which only understands mm/dd/yyyy.
 */
@Injectable()
export class PtBrDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      const parsed = this.parseBrazilianDate(trimmed);
      // matDatepicker treats null as "empty" — return invalid Date to trigger matDatepickerParse error
      return parsed ?? new Date(NaN);
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: object): string {
    if (!this.isValid(date)) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseBrazilianDate(value: string): Date | null {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) return null;

    const day = parseInt(digits.substring(0, 2), 10);
    const month = parseInt(digits.substring(2, 4), 10);
    const year = parseInt(digits.substring(4, 8), 10);

    if (
      day < 1 || day > 31 ||
      month < 1 || month > 12 ||
      year < 1900 ||
      year > 2099
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null;
    }
    return date;
  }
}

export const PT_BR_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'dd/mm/yyyy',
  },
  display: {
    dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
