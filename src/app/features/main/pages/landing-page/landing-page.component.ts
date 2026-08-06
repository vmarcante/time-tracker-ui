import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { HeaderService } from '../../../../shared/services/header.service';
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

  ngOnInit(): void {
    this.headerService.clearMobileMenuLinks();
  }

  ngOnDestroy(): void {
    this.headerService.clearMobileMenuLinks();
  }
}
