import { Injectable, signal } from '@angular/core';
import { MobileMenuLink } from '../types';

@Injectable({
  providedIn: 'root',
})
export class HeaderService {
  private mobileMenuLinks = signal<MobileMenuLink[] | null>(null);

  readonly links = this.mobileMenuLinks.asReadonly();

  setMobileMenuLinks(links: MobileMenuLink[] | null): void {
    this.mobileMenuLinks.set(links);
  }

  clearMobileMenuLinks(): void {
    this.mobileMenuLinks.set(null);
  }

  private loginRequest = signal(0);

  readonly loginRequestCount = this.loginRequest.asReadonly();

  requestLogin(): void {
    this.loginRequest.update((count) => count + 1);
  }
}
