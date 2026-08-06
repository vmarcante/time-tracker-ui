import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HeaderService } from '../../../../shared/services/header.service';
import { MobileMenuLink } from '../../../../shared/types';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit, OnDestroy {
  private headerService = inject(HeaderService);

  ngOnInit(): void {
    const links: MobileMenuLink[] = [
      { label: 'Resumo', action: () => this.scrollToSection('summary') },
      { label: 'Transações', action: () => this.scrollToSection('transactions') },
      { label: 'Relatórios', action: () => this.scrollToSection('reports') },
    ];

    this.headerService.setMobileMenuLinks(links);
  }

  ngOnDestroy(): void {
    this.headerService.clearMobileMenuLinks();
  }

  private scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
