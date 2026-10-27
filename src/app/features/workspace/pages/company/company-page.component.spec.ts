import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CompanyPageComponent } from './company-page.component';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { ToastrService } from '../../../../shared/services/toastr.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { LanguageService } from '../../../../shared/services/language.service';
import { WorkspaceCompanyService } from '../../services/workspace-company.service';
import { CompanyDetailOutput } from '../../../main/models/company-management.model';

const COMPANY: CompanyDetailOutput = {
  id: 'c1',
  legalName: 'Acme Tecnologia Ltda',
  tradeName: 'Acme',
  document: '12345678000190',
  description: 'Descricao',
  timezone: 'America/Sao_Paulo',
  active: true,
  createdAt: '2026-01-10T10:00:00',
  updatedAt: null,
};

describe('CompanyPageComponent', () => {
  const setup = (role: string) => {
    const updateCompany = vi.fn(() => of({ data: { ...COMPANY, legalName: 'Nova Razao' } }));
    const company = signal<CompanyDetailOutput | null>(COMPANY);
    const workspaceCompany = {
      company,
      displayName: signal('Acme'),
      load: vi.fn((_id: string, done?: () => void) => done?.()),
      set: vi.fn((value: CompanyDetailOutput) => company.set(value)),
    };
    const toastr = { successMessage: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: CompanyManagementApiService, useValue: { updateCompany } },
        {
          provide: AuthTokenService,
          useValue: { currentUser: () => ({ companyId: 'c1', companyRole: role }) },
        },
        {
          provide: ApiAdapterService,
          useValue: {
            executeRequest: (request: unknown, options: { onSuccess?: (r: unknown) => void }) =>
              (request as { subscribe: (fn: (r: unknown) => void) => void }).subscribe((r) =>
                options.onSuccess?.(r),
              ),
          },
        },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslationService, useValue: { translate: (key: string) => `t:${key}` } },
        { provide: LanguageService, useValue: { language: () => 'pt' } },
        { provide: WorkspaceCompanyService, useValue: workspaceCompany },
      ],
    });

    const component = TestBed.createComponent(CompanyPageComponent).componentInstance;
    component.ngOnInit();
    return { component, updateCompany, workspaceCompany, toastr };
  };

  it('lets only the OWNER edit', () => {
    expect(setup('OWNER').component.canEdit()).toBe(true);
  });

  it.each(['ADMIN', 'MANAGER', 'MEMBER'])('keeps %s read-only', (role) => {
    TestBed.resetTestingModule();
    expect(setup(role).component.canEdit()).toBe(false);
  });

  it('shows the CNPJ formatted and fills the form from the company', () => {
    const { component } = setup('OWNER');

    expect(component.formattedDocument()).toBe('12.345.678/0001-90');
    expect(component.documentControl.value).toBe('12.345.678/0001-90');
    expect(component.legalNameControl.value).toBe('Acme Tecnologia Ltda');
    expect(component.documentControl.disabled).toBe(true);
  });

  it('does not save an invalid form', () => {
    const { component, updateCompany } = setup('OWNER');
    component.legalNameControl.setValue('A');

    component.save();

    expect(updateCompany).not.toHaveBeenCalled();
    expect(component.legalNameControl.touched).toBe(true);
  });

  it('does not let non-owners save', () => {
    TestBed.resetTestingModule();
    const { component, updateCompany } = setup('ADMIN');
    component.legalNameControl.setValue('Outra razao');

    component.save();

    expect(updateCompany).not.toHaveBeenCalled();
  });

  it('sends trimmed values, nulls empty optionals and updates the shared company', () => {
    const { component, updateCompany, workspaceCompany, toastr } = setup('OWNER');
    component.legalNameControl.setValue('  Nova Razao  ');
    component.tradeNameControl.setValue('   ');
    component.descriptionControl.setValue('');

    component.save();

    expect(updateCompany).toHaveBeenCalledWith('c1', {
      legalName: 'Nova Razao',
      tradeName: null,
      description: null,
    });
    expect(workspaceCompany.set).toHaveBeenCalled();
    expect(toastr.successMessage).toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
