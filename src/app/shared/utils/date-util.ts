import { Injectable } from '@angular/core';

// ============================================
// DATE UTILITIES
// ============================================

export interface AvailableMonth {
  key: string;
  date: Date;
}

export interface AvailableYear {
  year: number;
  months: AvailableMonth[];
}

@Injectable({
  providedIn: 'root',
})
export class DateUtil {
  getAvailableYearsAndMonths(referenceDate: Date): AvailableYear[] {
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();
    const result: AvailableYear[] = [];

    for (let year = 2020; year <= currentYear; year++) {
      const maxMonth = year === currentYear ? currentMonth : 11;
      const months: AvailableMonth[] = [];
      for (let month = 0; month <= maxMonth; month++) {
        const date = new Date(year, month, 1);
        months.push({ key: this.getMonthKey(date), date });
      }
      result.push({ year, months });
    }

    return result;
  }

  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  buildDate(hour: number, minute: number, dayOffset: number = 0): string {
    const now = new Date();
    now.setDate(now.getDate() + dayOffset);
    now.setHours(hour, minute, 0, 0);
    return now.toISOString();
  }

  addMinutes(iso: string, minutes: number): string {
    const date = new Date(iso);
    date.setTime(date.getTime() + minutes * 60 * 1000);
    return date.toISOString();
  }

  formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (v: number): string => v.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  sessionsOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    const aStart = new Date(startA).getTime();
    const aEnd = new Date(endA).getTime();
    const bStart = new Date(startB).getTime();
    const bEnd = new Date(endB).getTime();
    return (
      !Number.isNaN(aStart) &&
      !Number.isNaN(aEnd) &&
      !Number.isNaN(bStart) &&
      !Number.isNaN(bEnd) &&
      aStart < bEnd &&
      aEnd > bStart
    );
  }
}
