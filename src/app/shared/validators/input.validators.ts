import {
  AbstractControl,
  FormArray,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export class InputValidators {
  static formGroupValid(
    formGroup: FormGroup,
    mustBeTouched: boolean = false,
    ignoreDisabled: boolean = false,
  ): boolean {
    const isValid = this.validateControl(formGroup, mustBeTouched, ignoreDisabled);

    if (!isValid) {
      formGroup.markAllAsTouched();
    }

    return isValid;
  }

  private static validateControl(
    control: AbstractControl,
    mustBeTouched: boolean,
    ignoreDisabled: boolean,
  ): boolean {
    if (ignoreDisabled && control.disabled) {
      return true;
    }

    if (mustBeTouched && !control.touched) {
      return true;
    }

    if (control instanceof FormGroup) {
      return Object.values(control.controls).every((child) =>
        this.validateControl(child, mustBeTouched, ignoreDisabled),
      );
    }

    if (control instanceof FormArray) {
      return control.controls.every((child) =>
        this.validateControl(child, mustBeTouched, ignoreDisabled),
      );
    }

    return control.valid;
  }

  static formGroupArrayValid(
    formArray: FormArray,
    mustBeTouched: boolean = false,
    ignoreDisabled: boolean = false,
  ): boolean {
    return formArray.controls.every((control) => {
      if (control instanceof FormGroup) {
        return this.formGroupValid(control, mustBeTouched, ignoreDisabled);
      }

      return this.validateControl(control, mustBeTouched, ignoreDisabled);
    });
  }

  /**
   * Forms Validation Functions
   */
  static doubleFormControlsMatchValidation(
    formControlNameBase: string,
    formControlNameBaseCompare: string,
    errorName: string,
  ): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const controlBase = formGroup.get(formControlNameBase);
      const controlCompare = formGroup.get(formControlNameBaseCompare);

      if (controlBase && controlCompare && controlBase.value != controlCompare.value) {
        controlCompare.setErrors({ [errorName]: true });
        return { [errorName]: true };
      }

      controlCompare?.setErrors(null);
      return null;
    };
  }

  static doubleFormControlsNotMatchValidation(
    formControlNameBase: string,
    formControlNameBaseCompare: string,
    errorName: string,
  ): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const controlBase = formGroup.get(formControlNameBase);
      const controlCompare = formGroup.get(formControlNameBaseCompare);

      if (!controlBase || !controlCompare) {
        return null;
      }

      if (!controlCompare.disabled && controlBase.value == controlCompare.value) {
        controlCompare.setErrors({ [errorName]: true });
        return { [errorName]: true };
      }

      controlCompare?.setErrors(null);
      return null;
    };
  }

  static markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  static insertErrorOnControl<T>(
    control: AbstractControl,
    errorName: string,
    value: T | null,
  ): void {
    if (!control) {
      return;
    }

    const currentErrors = control.errors || {};
    const { [errorName]: _, ...remainingErrors } = currentErrors;

    if (value === false || value === null || value === undefined) {
      const remainingKeys = Object.keys(remainingErrors);
      control.setErrors(remainingKeys.length > 0 ? remainingErrors : null);
      return;
    }

    control.setErrors({ ...remainingErrors, [errorName]: value });
  }
}
