import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { ApiAdapterService } from '../../../../../shared/services/api/api-adapter.service';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { CompanyManagementApiService } from '../../../services/company-management.api.service';
import { HomeView } from '../home-page.component';
import { AuthTokenService } from '../../../../auth/services/auth-token.service';

interface NavItem {
  view: HomeView;
  icon: string;
  labelKey: string;
  badgeText: () => string | null;
}

@Component({
  selector: 'app-company-overview',
  imports: [CommonModule, TranslatePipe, IconComponent],
  templateUrl: './company-overview.component.html',
  styleUrl: './company-overview.component.scss',
})
export class CompanyOverviewComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private translationService = inject(TranslationService);

  @Input() companyId: string | null = null;
  @Input() activeView: HomeView = 'overview';
  @Output() navigate = new EventEmitter<HomeView>();

  readonly companyName = computed(() => this.authTokenService.currentUser()?.name ?? '');

  readonly pendingCount = signal<number>(0);
  readonly loading = signal(true);

  readonly navItems: NavItem[] = [
    {
      view: 'requests',
      icon: 'objects/inbox',
      labelKey: 'home.overview.requests.label',
      badgeText: () =>
        this.pendingCount() > 0
          ? this.translationService.translate('home.overview.requests.pendingBadge', {
              count: this.pendingCount(),
            })
          : null,
    },
    {
      view: 'members',
      icon: 'objects/person',
      labelKey: 'home.overview.members.label',
      badgeText: () => null,
    },
    {
      view: 'teams',
      icon: 'objects/layers',
      labelKey: 'home.overview.teams.label',
      badgeText: () => null,
    },
    {
      view: 'projects',
      icon: 'objects/folder',
      labelKey: 'home.overview.projects.label',
      badgeText: () => null,
    },
    {
      view: 'time-entries',
      icon: 'objects/clock',
      labelKey: 'home.overview.timeEntries.label',
      badgeText: () => null,
    },
  ];

  ngOnInit(): void {
    if (!this.companyId) return;

    this.apiAdapter.executeRequest(this.companyApi.menuOverview(this.companyId), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.pendingCount.set(response.data.pendingMembershipsCount);
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });
  }
}
