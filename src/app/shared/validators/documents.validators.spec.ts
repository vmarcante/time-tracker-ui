import { FormControl } from '@angular/forms';
import { DocumentsValidators } from './documents.validators';

describe('DocumentsValidators.formatCnpj', () => {
  it('formats 14 raw digits', () => {
    expect(DocumentsValidators.formatCnpj('12345678000190')).toBe('12.345.678/0001-90');
  });

  it('keeps an already formatted CNPJ', () => {
    expect(DocumentsValidators.formatCnpj('12.345.678/0001-90')).toBe('12.345.678/0001-90');
  });

  it('returns the original value when it is not a CNPJ', () => {
    expect(DocumentsValidators.formatCnpj('123')).toBe('123');
  });

  it('returns an empty string for null or undefined', () => {
    expect(DocumentsValidators.formatCnpj(null)).toBe('');
    expect(DocumentsValidators.formatCnpj(undefined)).toBe('');
  });
});

describe('DocumentsValidators.cnpj', () => {
  it('accepts a valid formatted or raw CNPJ', () => {
    expect(DocumentsValidators.cnpj(new FormControl('11.222.333/0001-81'))).toBeNull();
    expect(DocumentsValidators.cnpj(new FormControl('11222333000181'))).toBeNull();
  });

  it('rejects wrong check digits and repeated digits', () => {
    expect(DocumentsValidators.cnpj(new FormControl('11.222.333/0001-82'))).toEqual({ cnpj: true });
    expect(DocumentsValidators.cnpj(new FormControl('11.111.111/1111-11'))).toEqual({ cnpj: true });
  });

  it('does not flag an empty value (required handles it)', () => {
    expect(DocumentsValidators.cnpj(new FormControl(''))).toBeNull();
  });
});
