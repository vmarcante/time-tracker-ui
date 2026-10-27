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
   * Formats a CNPJ as XX.XXX.XXX/XXXX-XX. Returns the input untouched when it
   * does not contain exactly 14 digits.
   */
  static formatCnpj(value: string | null | undefined): string {
    const digits = (value ?? '').replace(/\D/g, '');
    if (digits.length !== 14) {
      return value ?? '';
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  /**
   * Valid Brazilian area codes (DDD) — mirrors backend PhoneValidator.
   */
  private static readonly VALID_DDDS = new Set<number>([
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24,
    27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46,
    47, 48, 49,
    51, 53, 54, 55,
    61,
    62, 64,
    63,
    65, 66,
    67,
    68,
    69,
    71, 73, 74, 75, 77,
    79,
    81, 87,
    82,
    83,
    84,
    85, 88,
    86, 89,
    91, 93, 94,
    92, 97,
    95,
    96,
    98, 99,
  ]);

  /**
   * Validates a Brazilian phone number.
   * Mirrors backend PhoneValidator: 10-11 digits, valid DDD,
   * cellphones (11 digits) must have 9 as third digit, no repeated digits.
   * @param phoneNumber The phone number to validate
   * @returns True if the phone number is valid, false otherwise
   */
  static phone(phoneNumber: string): boolean {
    if (phoneNumber == null) {
      return false;
    }

    const phone = phoneNumber.replace(/[^\d]/g, '');

    if (phone.length !== 10 && phone.length !== 11) {
      return false;
    }

    if (!this.VALID_DDDS.has(parseInt(phone.substring(0, 2), 10))) {
      return false;
    }

    if (/^(\d)\1+$/.test(phone)) {
      return false;
    }

    if (phone.length === 11 && phone.charAt(2) !== '9') {
      return false;
    }

    return true;
  }

  /**
   * ValidatorFn wrapping phone() for reactive forms.
   * Empty values pass — combine with Validators.required when mandatory.
   */
  static phoneNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) {
      return null;
    }

    return DocumentsValidators.phone(value) ? null : { invalidPhone: true };
  }

  /**
   * Validates a person's full name mirroring backend rules.
   * Error value is the i18n key for the specific violated rule.
   * Empty values pass — combine with Validators.required/minLength/maxLength.
   */
  static fullName(control: AbstractControl): ValidationErrors | null {
    const raw = control.value as string;
    if (!raw) {
      return null;
    }

    const value = raw.trim();

    // Charset rule also covers digits and emoji (none are in the allowed set)
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) {
      return { fullName: 'validation.fullName.invalidChars' };
    }

    if (/\s{2,}/.test(value)) {
      return { fullName: 'validation.fullName.multipleSpaces' };
    }

    const parts = value.split(/\s+/);
    if (parts.length < 2) {
      return { fullName: 'validation.fullName.missingSurname' };
    }

    if (parts.some((part) => part.length < 2)) {
      return { fullName: 'validation.fullName.partTooShort' };
    }

    return null;
  }
}
