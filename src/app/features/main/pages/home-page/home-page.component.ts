import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { HeaderService } from '../../../../shared/services/header.service';
import { MobileMenuLink } from '../../../../shared/types';
import { RecentTimeEntriesComponent } from '../../components/time-entries/recent-entries/recent-time-entries.component';

interface QuickAction {
  id: string;
  label: string;
}

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, TranslatePipe, RecentTimeEntriesComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit, OnDestroy {
  private headerService = inject(HeaderService);

  readonly quickActions = signal<QuickAction[]>([
    { id: '1', label: 'home.quickActions.newTimeEntry' },
    { id: '2', label: 'home.quickActions.viewReports' },
    { id: '3', label: 'home.quickActions.manageProjects' },
    { id: '4', label: 'home.quickActions.exportData' },
  ]);

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
