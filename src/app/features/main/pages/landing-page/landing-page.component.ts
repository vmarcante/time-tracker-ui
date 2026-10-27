import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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

  ngOnInit(): void {
    this.headerService.clearMobileMenuLinks();
    this.openInviteRegistration();
  }

  ngOnDestroy(): void {
    this.headerService.clearMobileMenuLinks();
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
}
