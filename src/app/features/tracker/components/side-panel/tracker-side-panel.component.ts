import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { LanguageService } from '../../../../shared/services/language.service';
import { DateRange } from '../../../../shared/components/inputs/daterange/daterange-input.component';
import { TrackerApiService } from '../../services/tracker.api.service';
import { TimerService } from '../../services/timer.service';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  seconds: number;
}

/**
 * Painel lateral da página de entries: resumo do período, retomar tarefas,
 * presets de período e mini calendário. O período selecionado sobe para a
 * página via `periodSelect` — a fonte de verdade dos filtros fica nela.
 */
@Component({
  selector: 'app-tracker-side-panel',
  imports: [CommonModule, TranslatePipe, IconComponent],
  templateUrl: './tracker-side-panel.component.html',
  styleUrl: './tracker-side-panel.component.scss',
})
export class TrackerSidePanelComponent implements OnInit {
  private trackerApi = inject(TrackerApiService);
  private apiAdapter = inject(ApiAdapterService);
  private languageService = inject(LanguageService);
  private destroyRef = inject(DestroyRef);
  private timer = inject(TimerService);

  /** Filtro de período vigente na página (ISO strings) — usado para marcar preset/dia ativo. */
  readonly rangeFrom = input<string | null>(null);
  readonly rangeTo = input<string | null>(null);
  readonly periodSelect = output<DateRange>();

  /** Totais por dia (chave ISO YYYY-MM-DD) vindos do endpoint de heatmap. */
  readonly statsDays = signal<Map<string, number>>(new Map());
  readonly monthDays = signal<Map<string, number>>(new Map());
  readonly monthLoading = signal(false);
  readonly visibleMonth = signal<Date>(new Date());

  private readonly locale = computed(() =>
    this.languageService.language() === 'pt' ? 'pt-BR' : 'en-US',
  );

  // ---------- Resumo ----------

  readonly todaySeconds = computed(
    () => this.statsDays().get(this.dayKey(new Date())) ?? 0,
  );

  readonly weekSeconds = computed(() => {
    const today = new Date();
    return this.sumRange(this.statsDays(), this.startOfWeek(today), today);
  });

  readonly prevWeekSeconds = computed(() => {
    const weekStart = this.startOfWeek(new Date());
    const prevStart = new Date(weekStart);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(weekStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    return this.sumRange(this.statsDays(), prevStart, prevEnd);
  });

  readonly weekDeltaPct = computed(() => {
    const prev = this.prevWeekSeconds();
    const cur = this.weekSeconds();
    if (prev <= 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  });

  // ---------- Seleção de período (dia / semana / mês) ----------

  /** "Hoje" — salta para o mês vigente e filtra o dia. */
  selectToday(): void {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    if (month.getTime() !== this.startOfDay(this.visibleMonth()).getTime()) {
      this.visibleMonth.set(month);
      this.loadMonth();
    }
    const today = this.startOfDay(now);
    this.periodSelect.emit({ start: today, end: today });
  }

  /** Handle lateral da semana — seleciona seg–dom; clicar na semana ativa limpa. */
  selectWeek(week: CalendarDay[]): void {
    const first = week.at(0);
    const last = week.at(-1);
    if (!first || !last) return;
    if (this.isWeekSelected(week)) {
      this.periodSelect.emit({ start: null, end: null });
      return;
    }
    this.periodSelect.emit({ start: first.date, end: last.date });
  }

  /** Título do mês — seleciona 1º→último dia; clicar no mês ativo limpa. */
  selectMonth(): void {
    if (this.isMonthSelected()) {
      this.periodSelect.emit({ start: null, end: null });
      return;
    }
    const month = this.visibleMonth();
    this.periodSelect.emit({
      start: new Date(month.getFullYear(), month.getMonth(), 1),
      end: new Date(month.getFullYear(), month.getMonth() + 1, 0),
    });
  }

  isWeekSelected(week: CalendarDay[]): boolean {
    const first = week.at(0);
    const last = week.at(-1);
    const from = this.rangeFrom();
    const to = this.rangeTo();
    if (!first || !last || !from || !to) return false;
    return this.sameDay(new Date(from), first.date) && this.sameDay(new Date(to), last.date);
  }

  isMonthSelected(): boolean {
    const from = this.rangeFrom();
    const to = this.rangeTo();
    if (!from || !to) return false;
    const month = this.visibleMonth();
    return (
      this.sameDay(new Date(from), new Date(month.getFullYear(), month.getMonth(), 1)) &&
      this.sameDay(new Date(to), new Date(month.getFullYear(), month.getMonth() + 1, 0))
    );
  }

  /** Número ISO 8601 da semana (segunda-feira da linha). */
  weekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
      )
    );
  }

  // ---------- Calendário ----------

  readonly secondsByDay = computed(() => this.monthDays());

  readonly maxDaySeconds = computed(() => {
    let max = 1;
    for (const seconds of this.secondsByDay().values()) {
      if (seconds > max) max = seconds;
    }
    return max;
  });

  readonly calendarWeeks = computed<CalendarDay[][]>(() => {
    const month = this.visibleMonth();
    const secondsMap = this.secondsByDay();
    const today = new Date();
    const cursor = this.startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1));
    const weeks: CalendarDay[][] = [];
    while (true) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(cursor);
        week.push({
          date,
          inMonth: date.getMonth() === month.getMonth(),
          isToday: this.sameDay(date, today),
          seconds: secondsMap.get(this.dayKey(date)) ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      if (!week.some((day) => day.inMonth)) break;
      weeks.push(week);
    }
    return weeks;
  });

  readonly weekdayLabels = computed(() => {
    const format = new Intl.DateTimeFormat(this.locale(), { weekday: 'narrow' });
    const monday = this.startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(day.getDate() + i);
      return format.format(day);
    });
  });

  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    ),
  );

  shiftMonth(delta: number): void {
    const month = this.visibleMonth();
    this.visibleMonth.set(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    this.loadMonth();
  }

  isDaySelected(day: CalendarDay): boolean {
    const from = this.rangeFrom();
    const to = this.rangeTo();
    if (!from || !to) return false;
    return this.sameDay(new Date(from), day.date) && this.sameDay(new Date(to), day.date);
  }

  /** Dia dentro do intervalo vigente — marca todos os quadrados da semana/mês selecionados. */
  isDayInRange(day: CalendarDay): boolean {
    const from = this.rangeFrom();
    const to = this.rangeTo();
    if (!from || !to) return false;
    const time = this.startOfDay(day.date).getTime();
    return (
      time >= this.startOfDay(new Date(from)).getTime() &&
      time <= this.startOfDay(new Date(to)).getTime()
    );
  }

  selectDay(day: CalendarDay): void {
    if (this.isDaySelected(day)) {
      this.periodSelect.emit({ start: null, end: null });
      return;
    }
    this.periodSelect.emit({ start: day.date, end: day.date });
  }

  dayHeat(day: CalendarDay): string | null {
    if (!day.inMonth || day.seconds <= 0) return null;
    const pct = Math.round(10 + (day.seconds / this.maxDaySeconds()) * 40);
    return `color-mix(in srgb, var(--color-primary-500) ${pct}%, transparent)`;
  }

  // ---------- Ciclo de vida / fetch ----------

  ngOnInit(): void {
    this.visibleMonth.set(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    this.loadStats();
    this.loadMonth();
    this.timer.entryChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadStats();
        this.loadMonth();
      });
  }

  /** Semana passada → hoje — base dos cards de resumo. */
  private loadStats(): void {
    const weekStart = this.startOfWeek(new Date());
    const from = new Date(weekStart);
    from.setDate(from.getDate() - 7);
    this.apiAdapter.executeRequest(
      this.trackerApi.listDailyStats(this.dayKey(from), this.dayKey(new Date())),
      {
        ignoreLoading: true,
        subscriptionName: 'trackerSidePanelStats',
        onSuccess: (response) => this.statsDays.set(this.toDayMap(response.data)),
      },
    );
  }

  private loadMonth(): void {
    const month = this.visibleMonth();
    const from = this.dayKey(new Date(month.getFullYear(), month.getMonth(), 1));
    const to = this.dayKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    this.monthLoading.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.listDailyStats(from, to),
      {
        ignoreLoading: true,
        subscriptionName: 'trackerSidePanelMonth',
        onSuccess: (response) => {
          this.monthDays.set(this.toDayMap(response.data));
          this.monthLoading.set(false);
        },
        onError: () => this.monthLoading.set(false),
      },
    );
  }

  private toDayMap(days: { date: string; seconds: number }[]): Map<string, number> {
    return new Map(days.map((day) => [day.date, day.seconds]));
  }

  // ---------- Helpers ----------

  formatHours(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  /** Soma dias do mapa dentro de [from, to] — chaves ISO comparam lexicograficamente. */
  private sumRange(map: Map<string, number>, from: Date, to: Date): number {
    const fromKey = this.dayKey(from);
    const toKey = this.dayKey(to);
    let total = 0;
    for (const [day, seconds] of map) {
      if (day >= fromKey && day <= toKey) total += seconds;
    }
    return total;
  }

  private startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /** Segunda-feira da semana da data. */
  private startOfWeek(date: Date): Date {
    const result = this.startOfDay(date);
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
  }

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  /** ISO YYYY-MM-DD local — mesma chave que o backend retorna em `date`. */
  private dayKey(date: Date): string {
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
