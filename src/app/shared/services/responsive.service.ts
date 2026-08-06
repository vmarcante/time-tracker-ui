import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

@Injectable({
  providedIn: 'root',
})
export class ResponsiveService implements OnDestroy {
  // Signals para reatividade
  private currentBreakpoint = signal<Breakpoint>('desktop');
  private windowWidth = signal<number>(0);

  // Computed signals
  readonly isMobile = computed(() => this.currentBreakpoint() === 'mobile');
  readonly isTablet = computed(() => this.currentBreakpoint() === 'tablet');
  readonly isDesktop = computed(() => this.currentBreakpoint() === 'desktop');
  readonly isWide = computed(() => this.currentBreakpoint() === 'wide');
  readonly isMobileOrTablet = computed(() => this.isMobile() || this.isTablet());
  readonly isDesktopOrWide = computed(() => this.isDesktop() || this.isWide());

  // Breakpoints (mesmos do CSS)
  private readonly BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
  } as const;

  private readonly mobileQuery: MediaQueryList;
  private readonly tabletQuery: MediaQueryList;
  private readonly desktopQuery: MediaQueryList;
  private readonly wideQuery: MediaQueryList;
  private readonly queryListener: () => void;
  private destroy$ = new Subject<void>();

  constructor(private media: MediaMatcher) {
    this.mobileQuery = media.matchMedia(`(max-width: ${this.BREAKPOINTS.mobile - 1}px)`);
    this.tabletQuery = media.matchMedia(
      `(min-width: ${this.BREAKPOINTS.mobile}px) and (max-width: ${this.BREAKPOINTS.tablet - 1}px)`,
    );
    this.desktopQuery = media.matchMedia(
      `(min-width: ${this.BREAKPOINTS.tablet}px) and (max-width: ${this.BREAKPOINTS.desktop - 1}px)`,
    );
    this.wideQuery = media.matchMedia(`(min-width: ${this.BREAKPOINTS.desktop}px)`);

    this.queryListener = () => this.updateBreakpoint();

    this.mobileQuery.addEventListener('change', this.queryListener);
    this.tabletQuery.addEventListener('change', this.queryListener);
    this.desktopQuery.addEventListener('change', this.queryListener);
    this.wideQuery.addEventListener('change', this.queryListener);

    this.updateBreakpoint();

    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateBreakpoint();
      });
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeEventListener('change', this.queryListener);
    this.tabletQuery.removeEventListener('change', this.queryListener);
    this.desktopQuery.removeEventListener('change', this.queryListener);
    this.wideQuery.removeEventListener('change', this.queryListener);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateBreakpoint(): void {
    this.windowWidth.set(window.innerWidth);

    if (this.mobileQuery.matches) {
      this.currentBreakpoint.set('mobile');
    } else if (this.tabletQuery.matches) {
      this.currentBreakpoint.set('tablet');
    } else if (this.desktopQuery.matches) {
      this.currentBreakpoint.set('desktop');
    } else {
      this.currentBreakpoint.set('wide');
    }
  }

  getBreakpoint(): Breakpoint {
    return this.currentBreakpoint();
  }

  getWindowWidth(): number {
    return this.windowWidth();
  }
}
