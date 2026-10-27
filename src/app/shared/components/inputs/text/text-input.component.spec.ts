import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TextInputComponent } from './text-input.component';
import { TranslationService } from '../../../services/translation.service';
import { DocumentsValidators } from '../../../validators/documents.validators';

describe('TextInputComponent - document errors', () => {
  const create = (value: string, errorMessages: Record<string, string> = {}) => {
    const component = TestBed.createComponent(TextInputComponent).componentInstance;
    const control = new FormControl(value, [Validators.required, DocumentsValidators.cnpj]);
    component.formGroup = new FormGroup({ document: control });
    component.controlName = 'document';
    component.errorMessages = errorMessages;
    control.markAsTouched();
    return component;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslationService,
          useValue: { translate: (key: string) => `t:${key}` },
        },
      ],
    });
  });

  it('shows the required message when the document is empty', () => {
    const component = create('', { required: 'CNPJ obrigatório' });

    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toBe('CNPJ obrigatório');
  });

  it('shows the custom invalid message for a malformed CNPJ', () => {
    const component = create('11.111.111/1111-11', { cnpj: 'CNPJ inválido' });

    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toBe('CNPJ inválido');
  });

  it('falls back to the default invalid document message', () => {
    const component = create('123');

    expect(component.errorMessage).toBe('t:validation.invalidDocument');
  });

  it('uses any custom message for unknown validator keys', () => {
    const component = TestBed.createComponent(TextInputComponent).componentInstance;
    const control = new FormControl('x', () => ({ customRule: true }));
    component.control = control;
    component.errorMessages = { customRule: 'Regra customizada' };
    control.markAsTouched();

    expect(component.errorMessage).toBe('Regra customizada');
  });

  it('shows nothing for a valid CNPJ', () => {
    const component = create('11.222.333/0001-81');

    expect(component.hasError).toBe(false);
    expect(component.errorMessage).toBe('');
  });
});
