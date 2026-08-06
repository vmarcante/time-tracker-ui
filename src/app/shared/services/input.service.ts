import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { TranslationService } from './translation.service';
import { ErrorMessageContext, FieldErrorMapping } from '../types';

@Injectable({
  providedIn: 'root',
})
export class InputService {
  private translationService = inject(TranslationService);

  private readonly defaultErrorMappings: FieldErrorMapping[] = [
    {
      errorKey: 'required',
      translationKey: 'validation.required',
    },
    {
      errorKey: 'minlength',
      translationKey: 'validation.minLength',
      context: (errors) => ({
        length: (errors['minlength'] as Record<string, number>)['requiredLength'] ?? 0,
      }),
    },
    {
      errorKey: 'maxlength',
      translationKey: 'validation.maxLength',
      context: (errors) => ({
        length: (errors['maxlength'] as Record<string, number>)['requiredLength'] ?? 0,
      }),
    },
    {
      errorKey: 'email',
      translationKey: 'validation.invalidEmail',
    },
    {
      errorKey: 'pattern',
      translationKey: 'validation.invalidPhone',
      condition: (fieldName) => fieldName === 'phone',
    },
    {
      errorKey: 'pattern',
      translationKey: 'validation.usernamePattern',
      condition: (fieldName) => fieldName === 'username',
    },
    {
      errorKey: 'passwordStrength',
      translationKey: 'validation.passwordStrength',
    },
    {
      errorKey: 'passwordMismatch',
      translationKey: 'validation.passwordMismatch',
    },
  ];

  getFieldError(
    fieldName: string,
    formGroup: FormGroup,
    customMappings?: FieldErrorMapping[],
  ): string {
    const field = formGroup.get(fieldName);

    if (!field || !field.touched || !field.errors) {
      return '';
    }

    const mappings = customMappings ?? this.defaultErrorMappings;
    const errors = field.errors;

    for (const mapping of mappings) {
      if (!errors[mapping.errorKey]) {
        continue;
      }

      if (mapping.condition && !mapping.condition(fieldName, errors)) {
        continue;
      }

      const context = mapping.context ? mapping.context(errors) : {};

      return this.translationService.translate(mapping.translationKey, context);
    }

    return '';
  }

  getControlError(control: AbstractControl, customMappings?: FieldErrorMapping[]): string {
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    const mappings = customMappings ?? this.defaultErrorMappings;
    const errors = control.errors;

    for (const mapping of mappings) {
      if (!errors[mapping.errorKey]) {
        continue;
      }

      if (mapping.condition && !mapping.condition('', errors)) {
        continue;
      }

      const context = mapping.context ? mapping.context(errors) : {};

      return this.translationService.translate(mapping.translationKey, context);
    }

    return '';
  }
}
