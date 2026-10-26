import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiAdapterService } from './api-adapter.service';
import { ToastrService } from '../toastr.service';
import { TranslationService } from '../translation.service';

describe('ApiAdapterService - error toast', () => {
  let adapter: ApiAdapterService;
  let toastr: { errorMessage: ReturnType<typeof vi.fn> };
  let translation: { translate: ReturnType<typeof vi.fn> };

  const apiError = (message?: string, status = 400, url = '/api/companies') => ({
    status,
    url,
    error: { success: false, status, data: { key: 'some.key', message } },
  });

  beforeEach(() => {
    toastr = { errorMessage: vi.fn() };
    translation = { translate: vi.fn((key: string) => `t:${key}`) };

    TestBed.configureTestingModule({
      providers: [
        { provide: ToastrService, useValue: toastr },
        { provide: TranslationService, useValue: translation },
      ],
    });

    adapter = TestBed.inject(ApiAdapterService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('opt-in and opt-out', () => {
    it('shows the API message by default when showErrorToast is omitted', () => {
      adapter.executeRequest(throwError(() => apiError('Empresa não encontrada')));

      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
      expect(toastr.errorMessage).toHaveBeenCalledWith('Empresa não encontrada');
    });

    it('shows the toast when showErrorToast is true', () => {
      adapter.executeRequest(
        throwError(() => apiError('Empresa não encontrada')),
        {
          showErrorToast: true,
        },
      );

      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
    });

    it('does not show a toast when showErrorToast is false', () => {
      adapter.executeRequest(
        throwError(() => apiError('Empresa não encontrada')),
        {
          showErrorToast: false,
        },
      );

      expect(toastr.errorMessage).not.toHaveBeenCalled();
    });

    it('still calls onError when the toast is shown', () => {
      const onError = vi.fn();
      const error = apiError('Falhou');

      adapter.executeRequest(
        throwError(() => error),
        { onError },
      );

      expect(onError).toHaveBeenCalledWith(error);
      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
    });

    it('does not show a toast on success', () => {
      const onSuccess = vi.fn();

      adapter.executeRequest(of({ ok: true }), { onSuccess });

      expect(onSuccess).toHaveBeenCalledWith({ ok: true });
      expect(toastr.errorMessage).not.toHaveBeenCalled();
    });
  });

  describe('message resolution', () => {
    it('prefers the custom errorMessage over the API message', () => {
      adapter.executeRequest(
        throwError(() => apiError('Mensagem da API')),
        {
          errorMessage: 'Mensagem do chamador',
        },
      );

      expect(toastr.errorMessage).toHaveBeenCalledWith('Mensagem do chamador');
    });

    it('falls back to the network message when status is 0', () => {
      adapter.executeRequest(throwError(() => ({ status: 0, error: new ProgressEvent('error') })));

      expect(translation.translate).toHaveBeenCalledWith('common.errors.network');
      expect(toastr.errorMessage).toHaveBeenCalledWith('t:common.errors.network');
    });

    it('falls back to the generic message when the API sends no message', () => {
      adapter.executeRequest(throwError(() => apiError(undefined, 500)));

      expect(translation.translate).toHaveBeenCalledWith('common.errors.generic');
      expect(toastr.errorMessage).toHaveBeenCalledWith('t:common.errors.generic');
    });

    it('falls back to the generic message when the error body is not an API envelope', () => {
      adapter.executeRequest(
        throwError(() => ({ status: 502, error: '<html>Bad Gateway</html>' })),
      );

      expect(toastr.errorMessage).toHaveBeenCalledWith('t:common.errors.generic');
    });
  });

  describe('session expiry (401)', () => {
    it('does not show a toast for 401 on a private endpoint', () => {
      adapter.executeRequest(throwError(() => apiError('Token inválido', 401, '/api/companies')));

      expect(toastr.errorMessage).not.toHaveBeenCalled();
    });

    it('does not show a toast when the token refresh itself fails', () => {
      adapter.executeRequest(
        throwError(() => apiError('Token inválido', 401, '/api/public/auth/refresh')),
      );

      expect(toastr.errorMessage).not.toHaveBeenCalled();
    });

    it('does not show a toast for 401 without a url', () => {
      adapter.executeRequest(throwError(() => ({ status: 401, error: null })));

      expect(toastr.errorMessage).not.toHaveBeenCalled();
    });

    it('shows the toast for 401 on a public endpoint such as login', () => {
      adapter.executeRequest(
        throwError(() => apiError('Credenciais inválidas', 401, '/api/public/auth')),
      );

      expect(toastr.errorMessage).toHaveBeenCalledWith('Credenciais inválidas');
    });

    it('still shows the toast for 403 on a private endpoint', () => {
      adapter.executeRequest(throwError(() => apiError('Sem permissão', 403, '/api/companies')));

      expect(toastr.errorMessage).toHaveBeenCalledWith('Sem permissão');
    });
  });

  describe('deduplication', () => {
    it('shows a single toast for the same message in a short window', () => {
      adapter.executeRequest(throwError(() => apiError('Servidor indisponível', 503)));
      adapter.executeRequest(throwError(() => apiError('Servidor indisponível', 503)));
      adapter.executeRequest(throwError(() => apiError('Servidor indisponível', 503)));

      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
    });

    it('shows both toasts when the messages are different', () => {
      adapter.executeRequest(throwError(() => apiError('Erro A')));
      adapter.executeRequest(throwError(() => apiError('Erro B')));

      expect(toastr.errorMessage).toHaveBeenCalledTimes(2);
    });

    it('shows the same message again after the window expires', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

      adapter.executeRequest(throwError(() => apiError('Servidor indisponível', 503)));
      vi.setSystemTime(new Date('2026-01-01T10:00:02Z'));
      adapter.executeRequest(throwError(() => apiError('Servidor indisponível', 503)));
      vi.setSystemTime(new Date('2026-01-01T10:00:04Z'));
      adapter.executeRequest(throwError(() => apiError('Servidor indisponível', 503)));

      expect(toastr.errorMessage).toHaveBeenCalledTimes(2);
    });

    it('does not count muted requests towards the window', () => {
      adapter.executeRequest(
        throwError(() => apiError('Erro A')),
        { showErrorToast: false },
      );
      adapter.executeRequest(throwError(() => apiError('Erro A')));

      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('forkJoin and promise variants', () => {
    it('shows a single toast when several forkJoin requests fail', () => {
      adapter.executeForkJoinRequest([
        throwError(() => apiError('Primeiro erro')),
        throwError(() => apiError('Segundo erro')),
      ]);

      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
      expect(toastr.errorMessage).toHaveBeenCalledWith('Primeiro erro');
    });

    it('respects showErrorToast false in forkJoin', () => {
      adapter.executeForkJoinRequest([throwError(() => apiError('Erro'))], {
        showErrorToast: false,
      });

      expect(toastr.errorMessage).not.toHaveBeenCalled();
    });

    it('shows the toast and rejects in the promise variant', async () => {
      const promise = adapter.executeRequestWithPromise(
        throwError(() => apiError('Erro na promise')),
      );

      await expect(promise).rejects.toBeDefined();
      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
      expect(toastr.errorMessage).toHaveBeenCalledWith('Erro na promise');
    });

    it('does not show a toast in the promise variant when showErrorToast is false', async () => {
      const promise = adapter.executeRequestWithPromise(
        throwError(() => apiError('Erro na promise')),
        { showErrorToast: false },
      );

      await expect(promise).rejects.toBeDefined();
      expect(toastr.errorMessage).not.toHaveBeenCalled();
    });

    it('shows the toast in the forkJoin promise variant', async () => {
      const promise = adapter.executeForkJoinWithPromise([
        of({ success: true, status: 200, data: 1 }),
        throwError(() => apiError('Erro no fork')),
      ]);

      await expect(promise).rejects.toBeDefined();
      expect(toastr.errorMessage).toHaveBeenCalledTimes(1);
      expect(toastr.errorMessage).toHaveBeenCalledWith('Erro no fork');
    });
  });
});
