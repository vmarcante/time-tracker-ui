import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { HeaderService } from '../../../../shared/services/header.service';
import { DialogService } from '../../../../shared/services/dialog.service';
import { RegisterFormComponent } from '../../../auth/components/register/form/register-form.component';
import { MobileMenuLink } from '../../../../shared/types';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit, OnDestroy {
  private headerService = inject(HeaderService);
  private route = inject(ActivatedRoute);
  private dialogService = inject(DialogService);

  // Cronômetro ilustrativo do hero: começa em 02:14:37 e avança em tempo real.
  private readonly demoTimerStart = Date.now() - (2 * 3600 + 14 * 60 + 37) * 1000;
  private demoTimerId?: ReturnType<typeof setInterval>;

  protected readonly ticks = Array.from({ length: 60 }, (_, i) => i);
  protected readonly elapsed = signal(this.formatElapsed());
  protected readonly weekBars = [
    { label: 'S', value: 62, today: false },
    { label: 'T', value: 84, today: false },
    { label: 'Q', value: 55, today: false },
    { label: 'Q', value: 92, today: false },
    { label: 'S', value: 70, today: true },
  ];

  ngOnInit(): void {
    this.headerService.clearMobileMenuLinks();
    this.openInviteRegistration();
    this.demoTimerId = setInterval(() => this.elapsed.set(this.formatElapsed()), 1000);
  }

  ngOnDestroy(): void {
    this.headerService.clearMobileMenuLinks();
    clearInterval(this.demoTimerId);
  }

  openLogin(): void {
    this.headerService.requestLogin();
  }

  private openInviteRegistration(): void {
    const inviteToken = this.route.snapshot.queryParamMap.get('invite');
    if (!inviteToken) {
      return;
    }

    this.dialogService.openDialog<RegisterFormComponent, boolean>(
      RegisterFormComponent,
      {
        width: '600px',
        data: { inviteToken },
        closeCallback: () => {},
      },
      true,
    );
  }

  private formatElapsed(): string {
    const total = Math.floor((Date.now() - this.demoTimerStart) / 1000);
    const parts = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
    return parts.map((value) => String(value).padStart(2, '0')).join(':');
  }
}
