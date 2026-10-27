import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  Input,
  inject,
  signal,
  computed,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { LoginModalComponent } from '../../../../auth/components/login-modal/login-modal.component';
import { UserMenuComponent } from '../../../../auth/components/user-menu/user-menu.component';
import { PopoverComponent } from '../../../../../shared/components/popover/popover.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { MobileMenuComponent } from '../../../../../shared/components/mobile-menu/mobile-menu.component';
import { TimerWidgetComponent } from '../../../../tracker/components/timer-widget/timer-widget.component';
import { MenuToggleComponent } from '../../../../../shared/components/menu-toggle/menu-toggle.component';
import { MobileMenuLink, MobileMenuTheme } from '../../../../../shared/types';
import { ConfirmationDialogComponent } from '../../../../../shared/components/dialogs/confirmation/confirmation-dialog.component';
import { ResponsiveService } from '../../../../../shared/services/responsive.service';
import { HeaderService } from '../../../../../shared/services/header.service';
import { AuthTokenService } from '../../../../auth/services/auth-token.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { ApiAdapterService } from '../../../../../shared/services/api/api-adapter.service';
import { HealthApiService } from '../../../../../shared/services/api/health.api.service';
import { ConfirmationDialogConfiguration } from '../../../../../shared/types';

@Component({
  selector: 'app-layout-header',
  templateUrl: './layout-header.component.html',
  styleUrls: ['./layout-header.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LoginModalComponent,
    UserMenuComponent,
    PopoverComponent,
    ButtonComponent,
    MobileMenuComponent,
    MenuToggleComponent,
    TimerWidgetComponent,
  ],
})
export class LayoutHeaderComponent implements OnInit, OnDestroy {
  @ViewChild('loginModal') private loginModal!: LoginModalComponent;
  private intervalId?: number;
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private translationService = inject(TranslationService);
  private responsiveService = inject(ResponsiveService);
  private headerService = inject(HeaderService);
  private authTokenService = inject(AuthTokenService);
  private authService = inject(AuthService);
  private apiAdapterService = inject(ApiAdapterService);
  private healthApiService = inject(HealthApiService);

  isAuthenticated = this.authTokenService.isAuthenticated;
  currentUser = this.authTokenService.currentUser;
  userLoading = this.authTokenService.currentUserLoading;

  private loginRequestEffect = effect(() => {
    if (this.headerService.loginRequestCount() > 0) {
      this.loginModal?.open();
    }
  });

  private readonly navTracker = viewChild<ElementRef<HTMLElement>>('navTracker');
  private readonly navWorkspace = viewChild<ElementRef<HTMLElement>>('navWorkspace');
  private readonly activeSegment = signal<'tracker' | 'workspace' | null>(null);
  protected readonly indicatorX = signal(0);
  protected readonly indicatorWidth = signal(0);
  protected readonly indicatorVisible = signal(false);

  readonly canAccessWorkspace = computed(() => {
    const user = this.currentUser();
    if (!user || user.affiliation !== 'COMPANY') return false;
    const managerRoles = ['OWNER', 'ADMIN', 'MANAGER'];
    return managerRoles.includes(user.companyRole ?? '');
  });
  healthStatus = signal<string | null>(null);
  isHealthDown = computed(() => {
    const status = this.healthStatus();
    return status !== null && status !== 'UP';
  });

  @Input() customMobileMenuLinks: MobileMenuLink[] | null = null;

  isScrolled: boolean = false;
  isHovered: boolean = false;
  mobileMenuOpen: boolean = false;

  get mobileMenuLinks(): MobileMenuLink[] {
    const serviceLinks = this.headerService.links();

    if (this.customMobileMenuLinks) {
      return this.customMobileMenuLinks;
    }

    return serviceLinks ?? [];
  }

  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll);
    this.checkHealth();
  }

  ngOnDestroy(): void {
    this.stopAutoToggle();
    window.removeEventListener('scroll', this.onScroll);
  }

  private checkHealth(): void {
    this.apiAdapterService.executeRequest(this.healthApiService.checkHealth(), {
      subscriptionName: 'healthCheck',
      onSuccess: (response) => {
        this.healthStatus.set(response.data['status'] ?? null);
      },
      onError: () => {
        this.healthStatus.set('DOWN');
      },
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isScrolled = window.scrollY > 10;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateIndicatorPosition();
  }

  protected onSegmentActive(segment: 'tracker' | 'workspace', isActive: boolean): void {
    if (isActive) {
      this.activeSegment.set(segment);
    } else if (this.activeSegment() === segment) {
      this.activeSegment.set(null);
    }
    // Mede depois do layout assentar — a troca de rota pode vir antes do reflow.
    requestAnimationFrame(() => this.updateIndicatorPosition());
  }

  private updateIndicatorPosition(): void {
    const segment = this.activeSegment();
    const ref = segment === 'tracker' ? this.navTracker() : this.navWorkspace();
    const element = ref?.nativeElement;
    if (!segment || !element) {
      this.indicatorVisible.set(false);
      return;
    }
    this.indicatorX.set(element.offsetLeft);
    this.indicatorWidth.set(element.offsetWidth);
    this.indicatorVisible.set(true);
  }

  onPointerEnter(event: PointerEvent): void {
    // Toque dispara pointerenter sem pointerleave imediato: ignora para não "prender" o hover.
    if (event.pointerType !== 'touch') {
      this.isHovered = true;
    }
  }

  onPointerLeave(): void {
    this.isHovered = false;
  }

  get isScrolledOrHovered(): boolean {
    return this.isScrolled || this.isHovered;
  }

  get mobileMenuTheme(): MobileMenuTheme {
    if (this.isAuthenticated()) {
      return 'authenticated';
    }

    if (this.isScrolledOrHovered) {
      return 'scrolled';
    }

    return 'landing';
  }

  get headerClasses(): Record<string, boolean> {
    const isMobileOrTablet = this.responsiveService.isMobileOrTablet();

    return {
      'layout-wrapper__header--sticky': !isMobileOrTablet && !this.isAuthenticated(),
      'layout-wrapper__header--scrolled': this.isScrolledOrHovered && !this.mobileMenuOpen,
      'layout-wrapper__header--landing': !this.isAuthenticated(),
      'layout-wrapper__header--authenticated': this.isAuthenticated(),
      'layout-wrapper__header--mobile-menu-open': this.mobileMenuOpen,
    };
  }

  get logoClasses(): Record<string, boolean> {
    return {
      'header-logo': true,
      'header-logo--scrolled': this.isScrolledOrHovered,
    };
  }

  stopAutoToggle(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  protected scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.closeMobileMenu();
  }

  protected openMobileMenu(): void {
    this.mobileMenuOpen = true;
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  protected openLoginModal(): void {
    this.closeMobileMenu();
    this.loginModal.open();
  }

  protected isMobileOrTablet(): boolean {
    return this.responsiveService.isMobileOrTablet();
  }

  protected getInitials(): string {
    const user = this.currentUser();
    if (!user) {
      return '';
    }

    const parts = user.name
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);

    if (parts.length === 0) {
      return '';
    }

    if (parts.length === 1) {
      return parts[0]!.charAt(0).toUpperCase();
    }

    const first = parts[0]!.charAt(0).toUpperCase();
    const last = parts[parts.length - 1]!.charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  protected logout(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: this.logoutDialogConfig,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirm) {
        this.executeLogout();
      }
    });
  }

  protected openProfile(): void {
    this.router.navigate(['/settings']);
  }

  private executeLogout(): void {
    const request = this.authService.logout();
    this.apiAdapterService.executeRequest(request, {
      ignoreLoading: true,
      onSuccess: () => {
        this.router.navigate(['/']);
      },
      onError: () => {
        this.authTokenService.clearTokens();
        this.router.navigate(['/']);
      },
    });
  }

  get logoutDialogConfig(): ConfirmationDialogConfiguration {
    return {
      title: this.translationService.translate('header.logoutDialog.title'),
      message: this.translationService.translate('header.logoutDialog.message'),
      closeable: true,
      buttons: {
        cancel: {
          show: true,
          order: 1,
          name: 'cancel',
          text: this.translationService.translate('common.dialog.cancel'),
          color: 'outline-error',
        },
        confirmation: {
          show: true,
          order: 2,
          name: 'confirm',
          text: this.translationService.translate('common.dialog.confirm'),
          color: 'error',
        },
      },
    };
  }
}
