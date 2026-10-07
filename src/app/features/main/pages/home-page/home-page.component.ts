import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { RecentTimeEntriesComponent } from '../../components/time-entries/recent-entries/recent-time-entries.component';
import { CompanyOverviewComponent } from './overview/company-overview.component';
import { MembersSectionComponent } from './sections/members-section/members-section.component';
import { RequestsSectionComponent } from './sections/requests-section/requests-section.component';
import { TeamsSectionComponent } from './sections/teams-section/teams-section.component';
import { ProjectsSectionComponent } from './sections/projects-section/projects-section.component';
import { TimeEntriesSectionComponent } from './sections/time-entries-section/time-entries-section.component';

export type HomeView = 'overview' | 'members' | 'requests' | 'teams' | 'projects' | 'time-entries';

@Component({
  selector: 'app-home-page',
  imports: [
    TranslatePipe,
    RecentTimeEntriesComponent,
    CompanyOverviewComponent,
    MembersSectionComponent,
    RequestsSectionComponent,
    TeamsSectionComponent,
    ProjectsSectionComponent,
    TimeEntriesSectionComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit, OnDestroy {
  private authTokenService = inject(AuthTokenService);

  readonly currentUser = this.authTokenService.currentUser;

  readonly companyId = computed(() => this.currentUser()?.companyId ?? null);
  readonly companyRole = computed(() => this.currentUser()?.companyRole ?? null);
  readonly isManager = computed(() => {
    const role = this.companyRole();
    return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
  });

  readonly activeView = signal<HomeView>('overview');
  readonly rightAnimating = signal(false);

  navigateTo(view: HomeView): void {
    if (view === this.activeView()) return;
    this.animateRight(() => this.activeView.set(view));
  }

  navigateBack(): void {
    this.animateRight(() => this.activeView.set('overview'));
  }

  private animateRight(switchFn: () => void): void {
    this.rightAnimating.set(true);
    setTimeout(() => {
      switchFn();
      setTimeout(() => this.rightAnimating.set(false), 280);
    }, 150);
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}
}
