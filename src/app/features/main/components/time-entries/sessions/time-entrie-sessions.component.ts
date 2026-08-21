import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  input,
  output,
  OnInit,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeEntrySession } from '../../../../../shared/types';

interface TimelineSegment {
  top: number;
  height: number;
  start: string;
  end: string;
  duration: string;
  session: TimeEntrySession;
}

interface HourTick {
  hour: number;
  top: number;
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-time-entrie-sessions',
  imports: [CommonModule],
  templateUrl: './time-entrie-sessions.component.html',
  styleUrl: './time-entrie-sessions.component.scss',
})
export class TimeEntrieSessionsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly sessions = input.required<TimeEntrySession[]>();
  readonly entryStart = input.required<string>();
  readonly entryEnd = input.required<string>();
  readonly hourClick = output<string>();
  readonly sessionClick = output<TimeEntrySession>();
  readonly sessionResize = output<{ original: TimeEntrySession; updated: TimeEntrySession }>();

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

  private dragHandle: 'top' | 'bottom' | null = null;
  private dragSegmentIndex = -1;
  private dragTrackEl: HTMLElement | null = null;
  private wasDragging = false;
  private readonly draggedOverride = signal<{ index: number; top: number; height: number } | null>(
    null,
  );
  private readonly boundOnDragMove = (e: MouseEvent) => this.onDragMove(e);
  private readonly boundOnDragEnd = (e: MouseEvent) => this.onDragEnd(e);

  readonly availableYears = computed<number[]>(() => {
    const today = new Date(this.now());
    const years: number[] = [];
    for (let y = 2020; y <= today.getFullYear(); y++) {
      years.push(y);
    }
    return years;
  });

  readonly availableMonths = computed<{ key: string; date: Date }[]>(() => {
    const year = this.selectedYear();
    if (!year) {
      return [];
    }
    const today = new Date(this.now());
    const maxMonth = year === today.getFullYear() ? today.getMonth() : 11;
    const months: { key: string; date: Date }[] = [];
    for (let m = 0; m <= maxMonth; m++) {
      const date = new Date(year, m, 1);
      months.push({ key: this.getMonthKey(date), date });
    }
    return months;
  });

  readonly daysInSelectedMonth = computed<Date[]>(() => {
    const key = this.selectedMonth();
    if (!key) {
      return [];
    }
    const [yearStr, monthStr] = key.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const today = new Date(this.now());
    today.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    const current = new Date(year, month, 1);
    while (current.getMonth() === month && current <= today) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  });

  readonly dayStart = computed<number>(() => {
    const day = new Date(this.selectedDate());
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  });

  readonly filteredSessions = computed<TimeEntrySession[]>(() => {
    const dayStart = this.dayStart();
    const dayEnd = dayStart + DAY_MS;
    return this.sessions().filter((session) => {
      const start = new Date(session.start).getTime();
      const end = new Date(session.end).getTime();
      return !Number.isNaN(start) && !Number.isNaN(end) && start < dayEnd && end > dayStart;
    });
  });

  readonly totalDuration = computed(() =>
    this.filteredSessions().reduce((total, session) => {
      const start = new Date(session.start).getTime();
      const end = new Date(session.end).getTime();
      return (
        total +
        (Number.isNaN(start) || Number.isNaN(end) || end <= start
          ? 0
          : Math.floor((end - start) / 1000))
      );
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

  readonly timeTicks = computed<HourTick[]>(() => {
    const ticks: HourTick[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) {
        const isHour = minute === 0;
        const date = new Date(this.dayStart());
        date.setHours(hour, minute, 0, 0);
        ticks.push({
          hour,
          top: ((hour * 60 + minute) / 1440) * 100,
          label: isHour ? this.timeLabel(date) : '',
        });
      }
    }
    return ticks;
  });

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
          duration: this.formatDuration(totalSeconds),
          session,
        };
      });
  });

  readonly displaySegments = computed<TimelineSegment[]>(() => {
    const segs = this.segments();
    const override = this.draggedOverride();
    if (!override) {
      return segs;
    }
    const dayStart = this.dayStart();
    return segs.map((seg, i) => {
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
        duration: this.formatDuration(totalSeconds),
      };
    });
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

  ngAfterViewInit(): void {
    this.scrollToCursor();
    this.scrollActiveDay();
  }

  ngOnInit(): void {
    const sessions = this.sessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let initialDate = new Date(today);

    let latestSessionTime = 0;
    for (const s of sessions) {
      const start = new Date(s.start).getTime();
      if (!Number.isNaN(start) && start > latestSessionTime) {
        latestSessionTime = start;
      }
    }

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
  }

  protected isDateSelected(date: Date): boolean {
    const sel = this.selectedDate();
    return (
      date.getFullYear() === sel.getFullYear() &&
      date.getMonth() === sel.getMonth() &&
      date.getDate() === sel.getDate()
    );
  }

  protected selectDay(date: Date): void {
    this.selectedDate.set(date);
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
    const sessions = this.sessions();
    let bestMonth = months[months.length - 1];
    for (let i = months.length - 1; i >= 0; i--) {
      const m = months[i];
      if (!m) {
        continue;
      }
      const [yearStr, monthStr] = m.key.split('-');
      const y = Number(yearStr);
      const mo = Number(monthStr) - 1;
      const monthStart = new Date(y, mo, 1).getTime();
      const monthEnd = new Date(y, mo + 1, 0, 23, 59, 59, 999).getTime();
      const hasSession = sessions.some((s) => {
        const start = new Date(s.start).getTime();
        return !Number.isNaN(start) && start >= monthStart && start <= monthEnd;
      });
      if (hasSession) {
        bestMonth = m;
        break;
      }
    }
    if (!bestMonth) {
      return;
    }
    this.selectMonth(bestMonth.key);
  }

  protected selectMonth(key: string): void {
    this.selectedMonth.set(key);
    const days = this.daysInSelectedMonth();
    const sessions = this.sessions();
    let bestDay = days[days.length - 1] ?? new Date();

    for (let i = days.length - 1; i >= 0; i--) {
      const day = days[i];
      if (!day) {
        continue;
      }
      const dayMs = day.getTime();
      const dayEnd = dayMs + DAY_MS;
      const hasSession = sessions.some((s) => {
        const start = new Date(s.start).getTime();
        const end = new Date(s.end).getTime();
        return start < dayEnd && end > dayMs;
      });
      if (hasSession) {
        bestDay = day;
        break;
      }
    }

    this.selectedDate.set(bestDay);
    requestAnimationFrame(() => {
      this.scrollToCursor();
      this.scrollActiveDay();
    });
  }

  private scrollActiveDay(): void {
    const container = this.daySelectorScrollRef()?.nativeElement;
    if (!container) {
      return;
    }
    const activeBtn = container.querySelector<HTMLElement>(
      '.time-entrie-sessions__day-btn--active',
    );
    activeBtn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number): string => value.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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
    const date = new Date(this.dayStart());
    date.setHours(0, snapped, 0, 0);
    this.hourClick.emit(date.toISOString());
  }

  protected onEnterKey(): void {
    const date = new Date(this.dayStart());
    date.setHours(this.currentHour(), 0, 0, 0);
    this.hourClick.emit(date.toISOString());
  }

  protected onSessionClick(session: TimeEntrySession, event: MouseEvent): void {
    event.stopPropagation();
    this.sessionClick.emit(session);
  }

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
        const updated: TimeEntrySession = {
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

  protected duration(start: string, end: string): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      return 0;
    }
    return Math.floor((endTime - startTime) / 1000);
  }
}
