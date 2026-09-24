import { AbstractControl, ValidationErrors } from '@angular/forms';

export class DocumentsValidators {
  /**
   * Validates password strength based on the backend rules.
   * Requires: 8-128 chars, uppercase, lowercase, number, special char, no spaces, no emoji.
   */
  static passwordStrength(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(value);
    const hasSpaces = value.includes(' ');
    const hasEmoji = /\p{Emoji_Presentation}/u.test(value);

    const passwordValid =
      hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar && !hasSpaces && !hasEmoji;

    return !passwordValid ? { passwordStrength: true } : null;
  }

  /**
   * Validates a username based on the backend rules.
   * Requires: 3-30 chars, no spaces, only a-zA-Z0-9._, cannot start/end with . or _,
   * no consecutive . or _ or combinations.
   */
  static username(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) {
      return null;
    }

    if (value.includes(' ')) {
      return { pattern: true };
    }

    if (!/^[a-zA-Z0-9._]+$/.test(value)) {
      return { pattern: true };
    }

    if (value.startsWith('.') || value.startsWith('_')) {
      return { pattern: true };
    }

    if (value.endsWith('.') || value.endsWith('_')) {
      return { pattern: true };
    }

    if (
      value.includes('..') ||
      value.includes('__') ||
      value.includes('._') ||
      value.includes('_.')
    ) {
      return { pattern: true };
    }

    return null;
  }

  /**
   * Validates a URL.
   * Accepts http:// and https:// URLs with a valid domain.
   */
  static url(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) {
      return null;
    }

    const urlPattern = /^(https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?$/;
    return urlPattern.test(value) ? null : { url: true };
  }

  /**
   * Validates a Brazilian CNPJ including its check digits.
   * Accepts formatted (XX.XXX.XXX/XXXX-XX) or digit-only input.
   */
  static cnpj(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) {
      return null;
    }

    const digits = value.replace(/[^\d]/g, '');

    if (digits.length !== 14) {
      return { cnpj: true };
    }

    if (/^(\d)\1{13}$/.test(digits)) {
      return { cnpj: true };
    }

    const calculateDigit = (weights: number[]): number => {
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += Number(digits.charAt(i)) * (weights[i] ?? 0);
      }
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calculateDigit([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (Number(digits.charAt(12)) !== firstDigit) {
      return { cnpj: true };
    }

    const secondDigit = calculateDigit([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (Number(digits.charAt(13)) !== secondDigit) {
      return { cnpj: true };
    }

    return null;
  }

  /**
   * Validates a Brazilian phone number
   * @param phoneNumber The phone number to validate
   * @returns True if the phone number is valid, false otherwise
   */
  static phone(phoneNumber: string): boolean {
    if (phoneNumber == null) {
      return false;
    }

    const phone = phoneNumber.replace(/[^\d]/g, '');

    if (phone.length < 10 || phone.length > 11) {
      return false;
    }

    if (/(\d)\1{9,10}/.test(phone)) {
      return false;
    }

    if (phone.length === 10) {
      return true;
    }

    if (phone.length === 11) {
      const nineDigitCellphone = phone.charAt(2);
      if (nineDigitCellphone !== '9') {
        return false;
      }

      return true;
    }

    return false;
  }
}
