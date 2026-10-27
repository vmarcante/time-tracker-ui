import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import {
  DateRange,
  DaterangeInputComponent,
} from '../../../../shared/components/inputs/daterange/daterange-input.component';
import { PeopleFilterComponent } from '../people-filter/people-filter.component';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import {
  CompanyRunningMemberOutput,
  CompanyTimeEntryStatsOutput,
} from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { TimerService } from '../../../tracker/services/timer.service';

type StatsVariant = 'full' | 'compact';
type StatsPreset = 7 | 30 | 90;
type StatsPeriod = StatsPreset | 'custom';

interface DaySegment {
  projectId: string;
  projectName: string;
  seconds: number;
  color: string;
  height: number;
}

interface DayColumn {
  date: string;
  total: number;
  segments: DaySegment[];
}

interface DonutSegment {
  projectId: string;
  projectName: string;
  clientName: string | null;
  seconds: number;
  entryCount: number;
  color: string;
  share: number;
  dashArray: string;
  dashOffset: number;
}

const PROJECT_PALETTE = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#e11d48',
];

@Component({
  selector: 'app-company-stats',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    DaterangeInputComponent,
    PeopleFilterComponent,
  ],
  templateUrl: './company-stats.component.html',
  styleUrl: './company-stats.component.scss',
})
export class CompanyStatsComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private timer = inject(TimerService);
  private destroyRef = inject(DestroyRef);

  readonly variant = input<StatsVariant>('full');

  /** Filtros efetivos aplicados — o pai usa pra filtrar a listagem junto. */
  readonly filterChange = output<{
    from: string;
    to: string;
    userIds: string[];
    teamIds: string[];
  }>();

  readonly stats = signal<CompanyTimeEntryStatsOutput | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);

  /* Relatorio PDF completo da empresa: apenas quem administra a empresa. */
  readonly canExportReport = computed(() => {
    const role = this.authTokenService.currentUser()?.companyRole;
    return role === 'OWNER' || role === 'ADMIN';
  });
  readonly preset = signal<StatsPeriod>(30);
  readonly presets: StatsPreset[] = [7, 30, 90];
  readonly customRange = signal<{ start: Date; end: Date } | null>(null);

  readonly periodGroup = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  /* Seleção do filtro composto pessoas/times (união membro OU time). */
  readonly selectedUserIds = signal<string[]>([]);
  readonly selectedTeamIds = signal<string[]>([]);



  readonly maxDaySeconds = computed(() =>
    Math.max(1, ...(this.stats()?.days ?? []).map((d) => d.seconds)),
  );
  readonly maxMemberSeconds = computed(() =>
    Math.max(1, ...(this.stats()?.members ?? []).map((m) => m.seconds)),
  );

  readonly topMembers = computed(() => (this.stats()?.members ?? []).slice(0, 8));

  readonly running = computed<CompanyRunningMemberOutput[]>(() => this.stats()?.running ?? []);

  /** Colunas do dia empilhadas por projeto (cores consistentes por projectId). */
  readonly dayColumns = computed<DayColumn[]>(() => {
    const data = this.stats();
    if (!data) return [];
    const projectNames = new Map(data.projects.map((p) => [p.projectId, p.projectName]));
    const byDay = new Map<string, Map<string, number>>();
    for (const pd of data.projectDays ?? []) {
      if (!byDay.has(pd.date)) byDay.set(pd.date, new Map());
      const dayMap = byDay.get(pd.date)!;
      dayMap.set(pd.projectId, (dayMap.get(pd.projectId) ?? 0) + pd.seconds);
    }
    const max = this.maxDaySeconds();
    return data.days.map((day) => {
      const segments: DaySegment[] = [...(byDay.get(day.date)?.entries() ?? [])]
        .sort((a, b) => b[1] - a[1])
        .map(([projectId, seconds]) => ({
          projectId,
          projectName: projectNames.get(projectId) ?? '',
          seconds,
          color: this.projectColor(projectId),
          height: Math.max(4, (seconds / max) * 100),
        }));
      return { date: day.date, total: day.seconds, segments };
    });
  });

  /** Projetos presentes nas colunas (legenda do gráfico de dias). */
  readonly chartProjects = computed(() => {
    const data = this.stats();
    if (!data) return [];
    const seen = new Set<string>();
    const list: { projectId: string; projectName: string; color: string }[] = [];
    for (const pd of data.projectDays ?? []) {
      if (seen.has(pd.projectId)) continue;
      seen.add(pd.projectId);
      list.push({
        projectId: pd.projectId,
        projectName: data.projects.find((p) => p.projectId === pd.projectId)?.projectName ?? '',
        color: this.projectColor(pd.projectId),
      });
    }
    return list;
  });

  /** Donut de distribuição por projeto. */
  readonly donutSegments = computed<DonutSegment[]>(() => {
    const data = this.stats();
    if (!data || data.totalSeconds <= 0) return [];
    const circumference = 100;
    const withSeconds = data.projects.filter((p) => p.seconds > 0);
    const gap = withSeconds.length > 1 ? 0.6 : 0;
    let offset = 0;
    return withSeconds.map((p) => {
      const share = (p.seconds / data.totalSeconds) * circumference;
      const segment: DonutSegment = {
        projectId: p.projectId,
        projectName: p.projectName,
        clientName: p.clientName,
        seconds: p.seconds,
        entryCount: p.entryCount,
        color: this.projectColor(p.projectId),
        share,
        dashArray: `${Math.max(0.1, share - gap)} ${circumference - Math.max(0.1, share - gap)}`,
        dashOffset: -offset,
      };
      offset += share;
      return segment;
    });
  });

  readonly totalDelta = computed<number | null>(() => {
    const data = this.stats();
    if (!data || data.previousTotalSeconds <= 0) return null;
    return ((data.totalSeconds - data.previousTotalSeconds) / data.previousTotalSeconds) * 100;
  });

  readonly entriesDelta = computed<number | null>(() => {
    const data = this.stats();
    if (!data || data.previousEntryCount <= 0) return null;
    return ((data.entryCount - data.previousEntryCount) / data.previousEntryCount) * 100;
  });

  readonly avgPerDay = computed(() => {
    const data = this.stats();
    if (!data || data.days.length === 0) return 0;
    return data.totalSeconds / data.days.length;
  });

  readonly bestDay = computed(() => {
    const days = this.stats()?.days ?? [];
    if (days.length === 0) return null;
    const best = days.reduce((a, b) => (b.seconds > a.seconds ? b : a));
    return best.seconds > 0 ? best : null;
  });

  readonly labelStep = computed(() => {
    const total = this.stats()?.days.length ?? 1;
    return Math.max(1, Math.ceil(total / 8));
  });

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  ngOnInit(): void {
    this.load();
    this.timer.entryChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  /** Filtro composto emitiu nova união de membros/times — recarrega stats e propaga. */
  onPeopleSelection(selection: { userIds: string[]; teamIds: string[] }): void {
    this.selectedUserIds.set(selection.userIds);
    this.selectedTeamIds.set(selection.teamIds);
    this.load();
  }

  setPreset(preset: StatsPreset): void {
    if (this.preset() === preset) return;
    this.preset.set(preset);
    this.customRange.set(null);
    this.periodGroup.setValue({ start: null, end: null }, { emitEvent: false });
    this.load();
  }

  /** Ativa o modo customizado pré-preenchendo o range atual — sem mudança de dados nem salto visual. */
  enableCustom(): void {
    if (this.preset() === 'custom') return;
    const current = this.preset() as StatsPreset;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (current - 1));
    this.periodGroup.setValue({ start: from, end: to });
  }

  onPeriodChange(range: DateRange): void {
    if (!(range.start instanceof Date) || !(range.end instanceof Date)) return;
    this.customRange.set({ start: range.start, end: range.end });
    this.preset.set('custom');
    this.load();
  }

  load(): void {
    const companyId = this.companyId;
    if (!companyId) {
      this.loading.set(false);
      return;
    }

    const { fromParam, toParam } = this.currentRange();
    const userIds = this.selectedUserIds();
    const teamIds = this.selectedTeamIds();

    if (this.variant() !== 'compact') {
      this.filterChange.emit({ from: fromParam, to: toParam, userIds, teamIds });
    }

    this.loading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listCompanyTimeEntryStats(companyId, {
        from: fromParam,
        to: toParam,
        userIds,
        teamIds,
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.stats.set(response.data);
          this.loading.set(false);
        },
        onError: () => this.loading.set(false),
      },
    );
  }

  /** Período efetivo atualmente exibido, como datas locais. */
  private currentPeriod(): { from: Date; to: Date } {
    let from: Date;
    let to: Date;
    const custom = this.customRange();
    if (this.variant() !== 'compact' && this.preset() === 'custom' && custom) {
      from = new Date(custom.start);
      from.setHours(0, 0, 0, 0);
      to = new Date(custom.end);
      to.setHours(23, 59, 59, 0);
    } else {
      const days = this.variant() === 'compact' ? 7 : (this.preset() as StatsPreset);
      to = new Date();
      to.setHours(23, 59, 59, 0);
      from = new Date();
      from.setDate(from.getDate() - (days - 1));
      from.setHours(0, 0, 0, 0);
    }
    return { from, to };
  }

  /** Período efetivo atualmente exibido, nos mesmos parâmetros enviados à API. */
  private currentRange(): { fromParam: string; toParam: string } {
    const { from, to } = this.currentPeriod();
    return { fromParam: this.toApiDateTime(from), toParam: this.toApiDateTime(to) };
  }

  /** Baixa o relatório PDF completo da empresa usando o período exibido na tela. */
  exportReport(): void {
    const companyId = this.companyId;
    if (!companyId || this.exporting()) return;

    const { from, to } = this.currentPeriod();
    this.exporting.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.downloadCompanyReportPdf(companyId, {
        from: this.toApiDate(from),
        to: this.toApiDate(to),
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.saveFile(response.body, this.reportFileName(response.headers));
          this.exporting.set(false);
        },
        onError: () => this.exporting.set(false),
      },
    );
  }

  private reportFileName(headers: { get(name: string): string | null }): string {
    const disposition = headers.get('content-disposition') ?? '';
    const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition)?.[1];
    if (encoded) {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
    }
    const simple = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
    return simple?.trim() || 'report.pdf';
  }

  private saveFile(blob: Blob | null, fileName: string): void {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Cor determinística por projectId — estável entre presets e ordenações. */
  projectColor(projectId: string): string {
    let hash = 0;
    for (const ch of projectId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length]!;
  }

  formatHours(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m}min`;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  formatDelta(delta: number | null): string {
    if (delta === null) return '';
    const rounded = Math.round(Math.abs(delta));
    return `${delta >= 0 ? '+' : '−'}${rounded}%`;
  }

  runningElapsed(startedAt: string): string {
    const start = new Date(startedAt);
    if (Number.isNaN(start.getTime())) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
    return this.formatDuration(seconds);
  }

  dayLabel(isoDate: string): string {
    return isoDate.slice(8, 10) + '/' + isoDate.slice(5, 7);
  }

  dayTooltip(date: string, total: number): string {
    return `${this.dayLabel(date)} · ${this.formatHours(total)}`;
  }

  segmentTooltip(segment: DaySegment): string {
    return `${segment.projectName} · ${this.formatHours(segment.seconds)}`;
  }

  showDayLabel(index: number, total: number): boolean {
    return index % this.labelStep() === 0 || index === total - 1;
  }

  private toApiDateTime(date: Date): string {
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }

  private toApiDate(date: Date): string {
    return this.toApiDateTime(date).substring(0, 10);
  }
}
