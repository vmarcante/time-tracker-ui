import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  OnInit,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionView } from '../../../../tracker/models/tracker.model';
import { AvailableMonth, AvailableYear, DateUtil } from '../../../../../shared/utils/date-util';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

interface TimelineSegment {
  top: number;
  height: number;
  start: string;
  end: string;
  duration: string;
  session: SessionView;
  col: number;
  totalCols: number;
}

interface HourTick {
  hour: number;
  top: number;
  label: string;
}

interface DayOption {
  day: Date;
  hasSession: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TOUCH_CREATE_MINUTES = 15;

@Component({
  selector: 'app-time-entrie-sessions',
  imports: [CommonModule, TranslatePipe, ButtonComponent],
  templateUrl: './time-entrie-sessions.component.html',
  styleUrl: './time-entrie-sessions.component.scss',
})
export class TimeEntrieSessionsComponent implements OnInit, AfterViewInit, OnDestroy {
  // --- Inputs / Outputs ---
  readonly sessions = input.required<SessionView[]>();
  readonly selectedSession = input<SessionView | null>(null);
  readonly hourClick = output<string>();
  readonly sessionCreate = output<{ start: string; end: string }>();
  readonly sessionClick = output<SessionView>();
  readonly sessionResize = output<{ original: SessionView; updated: SessionView }>();
  readonly dayChange = output<Date>();

  // --- Component state ---
  readonly selectedDate = signal<Date>(new Date());
  readonly selectedYear = signal(0);
  readonly selectedMonth = signal('');

  private readonly now = signal<Date>(new Date());
  private intervalId?: number;
  private timeoutId?: number;
  private readonly timelineRef = viewChild<ElementRef<HTMLElement>>('timelineRef');
  private readonly daySelectorScrollRef =
    viewChild<ElementRef<HTMLElement>>('daySelectorScrollRef');
  private readonly TRACK_HEIGHT_PX = 3600;
  private readonly dateUtil = inject(DateUtil);

  private dragHandle: 'top' | 'bottom' | null = null;
  private dragSegmentIndex = -1;
  private dragTrackEl: HTMLElement | null = null;
  private wasDragging = false;
  private readonly draggedOverride = signal<{ index: number; top: number; height: number } | null>(
    null,
  );

  // --- Drag-to-create ---
  private createAnchorMin: number | null = null;
  private createTrackEl: HTMLElement | null = null;
  readonly createPreview = signal<{
    top: number;
    height: number;
    label: string;
    duration: string;
  } | null>(null);

  // Toque: o 1º toque só posiciona a prévia; a sessão é criada na confirmação.
  protected readonly pendingCreate = signal<{ start: string; end: string; label: string } | null>(
    null,
  );
  private readonly boundOnDragMove = (e: MouseEvent) => this.onDragMove(e);
  private readonly boundOnDragEnd = (e: MouseEvent) => this.onDragEnd(e);

  // --- Date selection state ---
  readonly availableYearsAndMonths = computed<AvailableYear[]>(() =>
    this.dateUtil.getAvailableYearsAndMonths(this.now()),
  );

  readonly availableYears = computed<number[]>(() =>
    this.availableYearsAndMonths().map((entry) => entry.year),
  );

  readonly availableMonths = computed<AvailableMonth[]>(() => {
    const year = this.selectedYear();
    const entry = this.availableYearsAndMonths().find((item) => item.year === year);
    return entry?.months ?? [];
  });

  readonly daysInSelectedMonth = computed<DayOption[]>(() => {
    const key = this.selectedMonth();
    if (!key) {
      return [];
    }

    const [yearStr, monthStr] = key.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const today = new Date(this.now());
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(year, month, 1);
    const daysCount = Math.max(
      0,
      Math.floor((today.getTime() - startOfMonth.getTime()) / DAY_MS) + 1,
    );

    const sessionKeys = new Set(
      this.sessions()
        .map((session) => new Date(session.start))
        .map((date) => {
          date.setHours(0, 0, 0, 0);
          return this.getDayKey(date);
        }),
    );

    return Array.from({ length: daysCount }, (_, index) => {
      const day = new Date(year, month, index + 1);
      return { day, hasSession: sessionKeys.has(this.getDayKey(day)) };
    });
  });

  readonly dayStart = computed<number>(() => {
    const day = new Date(this.selectedDate());
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  });

  readonly filteredSessions = computed<SessionView[]>(() => {
    const dayStart = this.dayStart();
    const dayEnd = dayStart + DAY_MS;
    const nowIso = this.now().toISOString();
    return this.sessions()
      .map((session) => (session.running ? { ...session, end: nowIso } : session))
      .filter((session) => {
        const start = new Date(session.start).getTime();
        const end = new Date(session.end).getTime();
        return !Number.isNaN(start) && !Number.isNaN(end) && start < dayEnd && end > dayStart;
      });
  });

  readonly totalDuration = computed<number>(() =>
    this.filteredSessions().reduce((total, session) => {
      const start = new Date(session.start).getTime();
      const end = new Date(session.end).getTime();
      const seconds =
        Number.isNaN(start) || Number.isNaN(end) || end <= start
          ? 0
          : Math.floor((end - start) / 1000);
      return total + seconds;
    }, 0),
  );

  readonly isToday = computed<boolean>(() => {
    const start = new Date(this.dayStart());
    const now = this.now();
    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  });

  // --- Timeline rendering ---
  readonly timeTicks = computed<HourTick[]>(() =>
    Array.from({ length: 24 * 12 }, (_, index) => {
      const hour = Math.floor(index / 12);
      const minute = (index % 12) * 5;
      const date = new Date(this.dayStart());
      date.setHours(hour, minute, 0, 0);
      return {
        hour,
        top: ((hour * 60 + minute) / 1440) * 100,
        label: minute === 0 ? this.timeLabel(date) : '',
      };
    }),
  );

  readonly segments = computed<TimelineSegment[]>(() => {
    const dayStart = this.dayStart();
    const dayEnd = dayStart + DAY_MS;

    return this.filteredSessions()
      .filter((session) => {
        const start = new Date(session.start).getTime();
        const end = new Date(session.end).getTime();
        return end > start;
      })
      .map((session) => {
        const start = new Date(session.start).getTime();
        const end = new Date(session.end).getTime();
        const clampedStart = Math.max(dayStart, start);
        const clampedEnd = Math.min(dayEnd, end);
        const top = ((clampedStart - dayStart) / DAY_MS) * 100;
        const height = ((clampedEnd - clampedStart) / DAY_MS) * 100;
        const totalSeconds = Math.floor((clampedEnd - clampedStart) / 1000);
        return {
          top,
          height,
          start: session.start,
          end: session.end,
          duration: this.dateUtil.formatDuration(totalSeconds),
          session,
          col: 0,
          totalCols: 1,
        };
      });
  });

  readonly displaySegments = computed<TimelineSegment[]>(() => {
    const laid = this.laidOutSegments();
    return this.createPreview() ? laid.slice(0, -1) : laid;
  });

  /** Segmentos + ghost do drag-create num único pass de colunas (sessões paralelas). */
  private readonly laidOutSegments = computed<TimelineSegment[]>(() => {
    const segs = this.segments();
    const override = this.draggedOverride();
    const dayStart = this.dayStart();

    const withOverride = override
      ? segs.map((seg, i) => {
          if (i !== override.index) {
            return seg;
          }
          const newStartMs = dayStart + (override.top / 100) * DAY_MS;
          const newEndMs = dayStart + ((override.top + override.height) / 100) * DAY_MS;
          const totalSeconds = Math.floor((newEndMs - newStartMs) / 1000);
          return {
            ...seg,
            top: override.top,
            height: override.height,
            duration: this.dateUtil.formatDuration(totalSeconds),
          };
        })
      : segs;

    const preview = this.createPreview();
    const ghostSegs = preview
      ? [
          ...withOverride,
          {
            top: preview.top,
            height: preview.height,
            start: '',
            end: '',
            duration: '',
            session: {} as SessionView,
            col: 0,
            totalCols: 1,
          },
        ]
      : withOverride;

    return this.applyColumnLayout(ghostSegs);
  });

  readonly cursorPosition = computed<number>(() => {
    const now = this.now();
    return ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  });

  readonly currentTimeLabel = computed<string>(() => this.timeLabel(this.now()));

  readonly currentHour = computed<number>(() => {
    return Math.floor((this.cursorPosition() / 100) * 24);
  });

  readonly selectedMonthLabel = computed<Date>(() => {
    const key = this.selectedMonth();
    if (!key) {
      return new Date();
    }
    const [yearStr, monthStr] = key.split('-');
    return new Date(Number(yearStr), Number(monthStr) - 1, 1);
  });

  readonly isFirstYear = computed(() => {
    const years = this.availableYears();
    return this.selectedYear() === years[0];
  });

  readonly isLastYear = computed(() => {
    const years = this.availableYears();
    return this.selectedYear() === years[years.length - 1];
  });

  readonly isFirstMonth = computed(() => {
    if (!this.isFirstYear()) {
      return false;
    }
    const months = this.availableMonths();
    return this.selectedMonth() === months[0]?.key;
  });

  readonly isLastMonth = computed(() => {
    if (!this.isLastYear()) {
      return false;
    }
    const months = this.availableMonths();
    return this.selectedMonth() === months[months.length - 1]?.key;
  });

  // --- Lifecycle ---
  ngAfterViewInit(): void {
    this.scrollToCursor();
    this.scrollActiveDay();
  }

  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestSessionTime = this.sessions()
      .map((session) => new Date(session.start).getTime())
      .filter((time) => !Number.isNaN(time))
      .reduce((max, time) => Math.max(max, time), 0);

    let initialDate = today;
    if (latestSessionTime > 0) {
      const candidate = new Date(latestSessionTime);
      candidate.setHours(0, 0, 0, 0);
      if (candidate.getTime() <= today.getTime()) {
        initialDate = candidate;
      }
    }

    this.selectedDate.set(initialDate);
    this.selectedYear.set(initialDate.getFullYear());
    this.selectedMonth.set(this.getMonthKey(initialDate));
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    this.timeoutId = window.setTimeout(() => {
      this.now.set(new Date());
      this.intervalId = window.setInterval(() => {
        this.now.set(new Date());
      }, 60000);
    }, msUntilNextMinute);
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
    document.removeEventListener('mousemove', this.boundOnDragMove);
    document.removeEventListener('mouseup', this.boundOnDragEnd);
    document.removeEventListener('mousemove', this.boundOnCreateMove);
    document.removeEventListener('mouseup', this.boundOnCreateEnd);
  }

  // --- Navigation handlers ---
  protected isDateSelected(date: Date): boolean {
    const sel = this.selectedDate();
    return (
      date.getFullYear() === sel.getFullYear() &&
      date.getMonth() === sel.getMonth() &&
      date.getDate() === sel.getDate()
    );
  }

  protected selectDay(date: Date): void {
    this.cancelPendingCreate();
    this.selectedDate.set(date);
    this.dayChange.emit(date);
    requestAnimationFrame(() => {
      this.scrollToCursor();
      this.scrollActiveDay();
    });
  }

  protected prevYear(): void {
    const years = this.availableYears();
    const idx = years.indexOf(this.selectedYear());
    if (idx > 0) {
      this.selectYear(years[idx - 1] ?? this.selectedYear());
    }
  }

  protected nextYear(): void {
    const years = this.availableYears();
    const idx = years.indexOf(this.selectedYear());
    if (idx < years.length - 1) {
      this.selectYear(years[idx + 1] ?? this.selectedYear());
    }
  }

  protected prevMonth(): void {
    const months = this.availableMonths();
    const idx = months.findIndex((m) => m.key === this.selectedMonth());
    if (idx > 0) {
      const m = months[idx - 1];
      if (m) {
        this.selectMonth(m.key);
      }
      return;
    }
    const years = this.availableYears();
    const yearIdx = years.indexOf(this.selectedYear());
    if (yearIdx <= 0) {
      return;
    }
    this.selectedYear.set(years[yearIdx - 1] ?? this.selectedYear());
    const prevMonths = this.availableMonths();
    const lastMonth = prevMonths[prevMonths.length - 1];
    if (lastMonth) {
      this.selectMonth(lastMonth.key);
    }
  }

  protected nextMonth(): void {
    const months = this.availableMonths();
    const idx = months.findIndex((m) => m.key === this.selectedMonth());
    if (idx < months.length - 1) {
      const m = months[idx + 1];
      if (m) {
        this.selectMonth(m.key);
      }
      return;
    }
    const years = this.availableYears();
    const yearIdx = years.indexOf(this.selectedYear());
    if (yearIdx >= years.length - 1) {
      return;
    }
    this.selectedYear.set(years[yearIdx + 1] ?? this.selectedYear());
    const nextMonths = this.availableMonths();
    const firstMonth = nextMonths[0];
    if (firstMonth) {
      this.selectMonth(firstMonth.key);
    }
  }

  protected selectYear(year: number): void {
    this.selectedYear.set(year);
    const months = this.availableMonths();
    if (!months.length) {
      return;
    }

    const selectedMonth = [...months].reverse().find((month) => this.hasSessionInMonth(month));
    const monthToSelect = selectedMonth ?? months[months.length - 1];
    if (!monthToSelect) {
      return;
    }

    this.selectMonth(monthToSelect.key);
    this.dayChange.emit(this.selectedDate());
  }

  private hasSessionInMonth(month: AvailableMonth): boolean {
    const monthStart = new Date(month.date.getFullYear(), month.date.getMonth(), 1).getTime();
    const monthEnd = new Date(
      month.date.getFullYear(),
      month.date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ).getTime();
    return this.sessions().some((session) => {
      const start = new Date(session.start).getTime();
      return !Number.isNaN(start) && start >= monthStart && start <= monthEnd;
    });
  }

  protected selectMonth(key: string): void {
    this.selectedMonth.set(key);
    const days = this.daysInSelectedMonth();
    const sessions = this.sessions();

    const selectedDay =
      [...days].reverse().find((day) => this.hasSessionInDay(day, sessions))?.day ??
      days[days.length - 1]?.day ??
      new Date();

    this.cancelPendingCreate();
    this.selectedDate.set(selectedDay);
    this.dayChange.emit(selectedDay);
    requestAnimationFrame(() => {
      this.scrollToCursor();
      this.scrollActiveDay();
    });
  }

  private hasSessionInDay(day: DayOption, sessions: SessionView[]): boolean {
    const dayStart = day.day.getTime();
    const dayEnd = dayStart + DAY_MS;
    return sessions.some((session) => {
      const start = new Date(session.start).getTime();
      const end = new Date(session.end).getTime();
      return start < dayEnd && end > dayStart;
    });
  }

  private scrollActiveDay(): void {
    const container = this.daySelectorScrollRef()?.nativeElement;
    const activeBtn = container?.querySelector<HTMLElement>(
      '.time-entrie-sessions__day-btn--active',
    );
    if (!container || !activeBtn) {
      return;
    }
    // Rolagem horizontal explícita: scrollIntoView também rolaria a página inteira.
    const box = container.getBoundingClientRect();
    const btn = activeBtn.getBoundingClientRect();
    container.scrollTo({
      left: container.scrollLeft + (btn.left - box.left) - (box.width - btn.width) / 2,
      behavior: 'smooth',
    });
  }

  // --- Date helpers ---
  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private getDayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private scrollToCursor(): void {
    const el = this.timelineRef()?.nativeElement;
    if (!el) {
      return;
    }
    const cursorPx = (this.cursorPosition() / 100) * this.TRACK_HEIGHT_PX;
    el.scrollTop = Math.max(0, cursorPx - el.clientHeight / 2);
  }

  protected formatDuration(totalSeconds: number): string {
    return this.dateUtil.formatDuration(totalSeconds);
  }

  protected timeLabel(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const displayHour = (hours % 12 || 12).toString().padStart(2, '0');
    const period = hours < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minutes} ${period}`;
  }

  private snapToMinutes(totalMinutes: number, snap = 5): number {
    return Math.round(totalMinutes / snap) * snap;
  }

  protected onTrackClick(event: MouseEvent): void {
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const percent = Math.max(0, Math.min(100, (y / rect.height) * 100));
    const snapped = this.snapToMinutes((percent / 100) * 1440);
    if (this.isTouchTap(event)) {
      this.previewTouchCreate(snapped);
      return;
    }
    const date = new Date(this.dayStart());
    date.setHours(0, snapped, 0, 0);
    this.hourClick.emit(date.toISOString());
  }

  protected confirmPendingCreate(): void {
    const pending = this.pendingCreate();
    if (!pending) {
      return;
    }
    this.cancelPendingCreate();
    this.sessionCreate.emit({ start: pending.start, end: pending.end });
  }

  protected cancelPendingCreate(): void {
    if (this.pendingCreate() === null) {
      return;
    }
    this.pendingCreate.set(null);
    this.createPreview.set(null);
  }

  private isTouchTap(event: MouseEvent): boolean {
    const pointerType = (event as PointerEvent).pointerType;
    if (pointerType) {
      return pointerType === 'touch';
    }
    return (
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    );
  }

  private previewTouchCreate(tappedMin: number): void {
    const startMin = Math.min(tappedMin, 1440 - TOUCH_CREATE_MINUTES);
    const start = new Date(this.dayStart() + startMin * 60_000);
    const end = new Date(start.getTime() + TOUCH_CREATE_MINUTES * 60_000);
    const label = `${this.timeLabel(start)} – ${this.timeLabel(end)}`;
    this.createPreview.set({
      top: (startMin / 1440) * 100,
      height: (TOUCH_CREATE_MINUTES / 1440) * 100,
      label,
      duration: `${TOUCH_CREATE_MINUTES}min`,
    });
    this.pendingCreate.set({ start: start.toISOString(), end: end.toISOString(), label });
  }

  protected onTrackMouseDown(event: MouseEvent, trackEl: HTMLElement): void {
    if (event.button !== 0) {
      return;
    }
    const hit = event.target as HTMLElement;
    if (hit.closest('.time-entrie-sessions__segment')) {
      return;
    }
    const rect = trackEl.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    this.createAnchorMin = this.snapToMinutes((y / rect.height) * 1440);
    this.createTrackEl = trackEl;
    this.wasDragging = false;
    document.addEventListener('mousemove', this.boundOnCreateMove);
    document.addEventListener('mouseup', this.boundOnCreateEnd);
  }

  private onCreateDragMove(event: MouseEvent): void {
    const track = this.createTrackEl;
    if (!track || this.createAnchorMin == null) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const current = this.snapToMinutes((y / rect.height) * 1440);
    if (current !== this.createAnchorMin) {
      this.wasDragging = true;
    }
    const startMin = Math.min(this.createAnchorMin, current);
    const endMin = Math.max(this.createAnchorMin, current);
    const startDate = new Date(this.dayStart() + startMin * 60_000);
    const endDate = new Date(this.dayStart() + endMin * 60_000);
    const totalSeconds = (endMin - startMin) * 60;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const compact =
      hours > 0
        ? `${hours}h${minutes > 0 ? String(minutes).padStart(2, '0') : ''}`
        : `${minutes}min`;
    this.createPreview.set({
      top: (startMin / 1440) * 100,
      height: ((endMin - startMin) / 1440) * 100,
      label: `${this.timeLabel(startDate)} – ${this.timeLabel(endDate)}`,
      duration: compact,
    });
  }

  private onCreateDragEnd(_event: MouseEvent): void {
    document.removeEventListener('mousemove', this.boundOnCreateMove);
    document.removeEventListener('mouseup', this.boundOnCreateEnd);
    const preview = this.createPreview();
    this.createPreview.set(null);
    this.createTrackEl = null;

    if (!preview || this.createAnchorMin == null || !this.wasDragging) {
      this.createAnchorMin = null;
      return;
    }

    const startMin = Math.round((preview.top / 100) * 1440);
    const endMin = Math.round(((preview.top + preview.height) / 100) * 1440);
    this.createAnchorMin = null;

    if (endMin - startMin < 5) {
      return;
    }

    const start = new Date(this.dayStart() + startMin * 60_000);
    const end = new Date(this.dayStart() + endMin * 60_000);
    this.sessionCreate.emit({ start: start.toISOString(), end: end.toISOString() });
  }

  private readonly boundOnCreateMove = (e: MouseEvent) => this.onCreateDragMove(e);
  private readonly boundOnCreateEnd = (e: MouseEvent) => this.onCreateDragEnd(e);

  protected onEnterKey(): void {
    const date = new Date(this.dayStart());
    date.setHours(this.currentHour(), 0, 0, 0);
    this.hourClick.emit(date.toISOString());
  }

  protected onSessionClick(session: SessionView, event: MouseEvent): void {
    event.stopPropagation();
    this.cancelPendingCreate();
    this.sessionClick.emit(session);
  }

  protected isSelectedSession(session: SessionView): boolean {
    const selected = this.selectedSession();
    return selected != null && selected.id === session.id;
  }

  // --- Drag & Resize ---
  protected onHandleMouseDown(
    event: MouseEvent,
    segmentIndex: number,
    handle: 'top' | 'bottom',
    trackEl: HTMLElement,
  ): void {
    event.stopPropagation();
    event.preventDefault();
    this.dragHandle = handle;
    this.dragSegmentIndex = segmentIndex;
    this.dragTrackEl = trackEl;
    this.wasDragging = false;
    document.addEventListener('mousemove', this.boundOnDragMove);
    document.addEventListener('mouseup', this.boundOnDragEnd);
  }

  private onDragMove(event: MouseEvent): void {
    const track = this.dragTrackEl;
    if (!track || this.dragSegmentIndex < 0 || !this.dragHandle) {
      return;
    }
    this.wasDragging = true;
    const rect = track.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const snapped = this.snapToMinutes((y / rect.height) * 1440);
    const snappedPercent = (snapped / 1440) * 100;
    const MIN_PERCENT = (5 / 1440) * 100;
    const seg = this.segments()[this.dragSegmentIndex];
    if (!seg) {
      return;
    }
    if (this.dragHandle === 'top') {
      const newTop = Math.min(snappedPercent, seg.top + seg.height - MIN_PERCENT);
      const newHeight = seg.top + seg.height - newTop;
      this.draggedOverride.set({ index: this.dragSegmentIndex, top: newTop, height: newHeight });
    } else {
      const newHeight = Math.max(MIN_PERCENT, snappedPercent - seg.top);
      this.draggedOverride.set({ index: this.dragSegmentIndex, top: seg.top, height: newHeight });
    }
  }

  private onDragEnd(_event: MouseEvent): void {
    document.removeEventListener('mousemove', this.boundOnDragMove);
    document.removeEventListener('mouseup', this.boundOnDragEnd);
    const override = this.draggedOverride();
    if (override && this.wasDragging) {
      const originalSegment = this.segments()[override.index];
      if (originalSegment) {
        const dayStart = this.dayStart();
        const newStartMs = dayStart + (override.top / 100) * DAY_MS;
        const newEndMs = dayStart + ((override.top + override.height) / 100) * DAY_MS;
        const updated: SessionView = {
          ...originalSegment.session,
          start: new Date(newStartMs).toISOString(),
          end: new Date(newEndMs).toISOString(),
        };
        this.sessionResize.emit({ original: originalSegment.session, updated });
      }
    }
    this.dragHandle = null;
    this.dragSegmentIndex = -1;
    this.dragTrackEl = null;
    this.draggedOverride.set(null);
  }

  // --- Layout helpers ---
  /**
   * Applies column layout to timeline segments.
   */
  private applyColumnLayout(segs: TimelineSegment[]): TimelineSegment[] {
    if (segs.length === 0) {
      return segs;
    }

    interface IndexedSegment {
      seg: TimelineSegment;
      origIndex: number;
    }

    const indexed: IndexedSegment[] = segs
      .map((seg, origIndex) => ({ seg, origIndex }))
      .sort((a, b) => a.seg.top - b.seg.top);

    const count = indexed.length;
    const parent = Array.from({ length: count }, (_, i) => i);

    const find = (i: number): number => {
      let root = i;
      while (parent[root] !== root) {
        root = parent[root] ?? root;
      }
      while (parent[i] !== root) {
        const next = parent[i] ?? i;
        parent[i] = root;
        i = next;
      }
      return root;
    };

    const union = (i: number, j: number): void => {
      parent[find(j)] = find(i);
    };

    for (let i = 0; i < count; i++) {
      const a = indexed[i];
      if (!a) {
        continue;
      }
      for (let j = i + 1; j < count; j++) {
        const b = indexed[j];
        if (b && this.segmentsOverlap(a.seg, b.seg)) {
          union(i, j);
        }
      }
    }

    const clusters = new Map<number, number[]>();
    for (let i = 0; i < count; i++) {
      const root = find(i);
      const members = clusters.get(root);
      if (members) {
        members.push(i);
      } else {
        clusters.set(root, [i]);
      }
    }

    const cols = new Array<number>(count).fill(0);
    const result = segs.map((seg) => ({ ...seg }));

    for (const members of clusters.values()) {
      const colEnds: number[] = [];
      let maxCol = 0;

      for (const i of members) {
        const current = indexed[i];
        if (!current) {
          continue;
        }
        const index = colEnds.findIndex((end) => end <= current.seg.top);
        const assigned = index !== -1 ? index : colEnds.length;
        colEnds[assigned] = current.seg.top + current.seg.height;
        cols[i] = assigned;
        maxCol = Math.max(maxCol, assigned);
      }

      const totalCols = Math.min(maxCol + 1, 3);
      for (const i of members) {
        const current = indexed[i];
        if (!current) {
          continue;
        }
        const target = result[current.origIndex];
        if (target) {
          target.col = (cols[i] ?? 0) % totalCols;
          target.totalCols = totalCols;
        }
      }
    }

    return result;
  }

  private segmentsOverlap(a: TimelineSegment, b: TimelineSegment): boolean {
    return a.top < b.top + b.height && a.top + a.height > b.top;
  }

  protected getSegmentLeft(seg: TimelineSegment): string {
    return this.colOffsets(seg.col, seg.totalCols).left;
  }

  protected getSegmentRight(seg: TimelineSegment): string {
    return this.colOffsets(seg.col, seg.totalCols).right;
  }

  private colOffsets(col: number, totalCols: number): { left: string; right: string } {
    const LABEL_PX = 76;
    const RIGHT_PX = 8;
    if (totalCols === 1) {
      return { left: `${LABEL_PX}px`, right: `${RIGHT_PX}px` };
    }
    const usable = `(100% - ${LABEL_PX}px - ${RIGHT_PX}px)`;
    const leftGap = col > 0 ? 2 : 0;
    const remaining = totalCols - col - 1;
    const rightGap = remaining > 0 ? 2 : 0;
    return {
      left: `calc(${LABEL_PX}px + ${col} * ${usable} / ${totalCols} + ${leftGap}px)`,
      right: `calc(${remaining} * ${usable} / ${totalCols} + ${RIGHT_PX}px + ${rightGap}px)`,
    };
  }

  /** Posição do ghost de drag-create — último segmento do pass de layout. */
  readonly ghostOffsets = computed<{ left: string; right: string } | null>(() => {
    if (!this.createPreview()) {
      return null;
    }
    const ghost = this.laidOutSegments().at(-1);
    return ghost ? this.colOffsets(ghost.col, ghost.totalCols) : null;
  });

  protected duration(start: string, end: string): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      return 0;
    }
    return Math.floor((endTime - startTime) / 1000);
  }
}
