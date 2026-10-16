import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiAdapterService } from '../../../shared/services/api/api-adapter.service';
import { ToastrService } from '../../../shared/services/toastr.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { TrackerApiService } from './tracker.api.service';
import {
  RunningTimerOutput,
  StartTimerInput,
  TimeEntryDetailOutput,
} from '../models/tracker.model';

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private api = inject(TrackerApiService);
  private apiAdapter = inject(ApiAdapterService);
  private toastr = inject(ToastrService);
  private translationService = inject(TranslationService);

  readonly running = signal<RunningTimerOutput | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);

  private readonly entryChangedSubject = new Subject<TimeEntryDetailOutput>();
  /** Emitido quando uma entry muda via timer (start/stop) ou mutações sincronizadas. */
  readonly entryChanged$ = this.entryChangedSubject.asObservable();

  /** Mantém o nome da entry vigente em sync com mutações (ex.: rename inline). */
  private readonly runningNameSync = this.entryChangedSubject.subscribe((detail) => {
    const current = this.running();
    if (current && current.entryId === detail.id && current.entryName !== detail.name) {
      this.running.set({ ...current, entryName: detail.name });
    }
  });

  private readonly nowTick = signal(Date.now());
  /** Relógio compartilhado — componentes derivam contadores a partir dele. */
  readonly now = this.nowTick.asReadonly();
  private intervalId?: number;
  private initialized = false;

  /** Segundos decorridos da sessão em curso (atualizado a cada segundo). */
  readonly elapsedSeconds = computed(() => {
    const current = this.running();
    if (!current) return 0;
    const startMs = new Date(current.session.startTime).getTime();
    if (Number.isNaN(startMs)) return 0;
    return Math.max(0, Math.floor((this.nowTick() - startMs) / 1000));
  });

  readonly runningEntryId = computed(() => this.running()?.entryId ?? null);

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.apiAdapter.executeRequest(this.api.currentTimer(), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.setRunning(response.data ?? null);
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });
  }

  start(input: StartTimerInput, onSuccess?: (entry: TimeEntryDetailOutput) => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.apiAdapter.executeRequest(this.api.startTimer(input), {
      onSuccess: (response) => {
        this.syncFromDetail(response.data);
        this.busy.set(false);
        onSuccess?.(response.data);
      },
      onError: (error) => {
        this.busy.set(false);
        this.notifyError(error);
      },
    });
  }

  stop(onSuccess?: (entry: TimeEntryDetailOutput) => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.apiAdapter.executeRequest(this.api.stopTimer(), {
      onSuccess: (response) => {
        this.setRunning(null);
        this.busy.set(false);
        this.entryChangedSubject.next(response.data);
        onSuccess?.(response.data);
      },
      onError: (error) => {
        this.busy.set(false);
        this.notifyError(error);
      },
    });
  }

  private notifyError(error: unknown): void {
    const message = (error as { error?: { data?: { message?: string } } })?.error?.data?.message;
    this.toastr.errorMessage(
      message ?? this.translationService.translate('tracker.timer.error'),
    );
  }

  /** Atualiza o estado a partir de um detail (resposta de start/stop/mutations). */
  syncFromDetail(entry: TimeEntryDetailOutput): void {
    this.entryChangedSubject.next(entry);
    const runningSession = entry.sessions.find((session) => session.running);
    if (runningSession) {
      this.setRunning({
        entryId: entry.id,
        entryName: entry.name,
        session: runningSession,
      });
      return;
    }
    // Entry parada: só limpa o running se for a própria entry em execução —
    // abrir/editar outra entry não deve derrubar o timer vigente.
    if (this.running()?.entryId === entry.id) {
      this.setRunning(null);
    }
  }

  private setRunning(value: RunningTimerOutput | null): void {
    this.running.set(value);
    if (value) {
      this.startTicking();
    } else {
      this.stopTicking();
    }
  }

  private startTicking(): void {
    this.nowTick.set(Date.now());
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => this.nowTick.set(Date.now()), 1000);
  }

  private stopTicking(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
