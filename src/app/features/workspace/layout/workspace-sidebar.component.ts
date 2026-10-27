import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ApiAdapterService } from '../../../shared/services/api/api-adapter.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { CompanyManagementApiService } from '../../main/services/company-management.api.service';
import { AuthTokenService } from '../../auth/services/auth-token.service';
import { CompanyRole } from '../../auth/models/person.model';
import { DocumentsValidators } from '../../../shared/validators/documents.validators';
import { WorkspaceCompanyService } from '../services/workspace-company.service';

interface SidebarNavItem {
  route: string;
  icon: string;
  labelKey: string;
  roles: CompanyRole[];
  badgeText: () => string | null;
}

@Component({
  selector: 'app-workspace-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe, IconComponent],
  templateUrl: './workspace-sidebar.component.html',
  styleUrl: './workspace-sidebar.component.scss',
})
export class WorkspaceSidebarComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private translationService = inject(TranslationService);
  private workspaceCompany = inject(WorkspaceCompanyService);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  readonly companyName = this.workspaceCompany.displayName;
  readonly companyDocument = computed(() =>
    DocumentsValidators.formatCnpj(this.workspaceCompany.company()?.document),
  );

  readonly pendingCount = signal<number>(0);
  readonly loading = signal(true);

  private readonly allNavItems: SidebarNavItem[] = [
    {
      route: '/workspace/company',
      icon: 'objects/building',
      labelKey: 'workspace.company.nav',
      roles: ['OWNER', 'ADMIN', 'MANAGER'],
      badgeText: () => null,
    },
    {
      route: '/workspace/requests',
      icon: 'objects/inbox',
      labelKey: 'workspace.overview.requests.label',
      roles: ['OWNER', 'ADMIN', 'MANAGER'],
      badgeText: () =>
        this.pendingCount() > 0
          ? this.translationService.translate('workspace.overview.requests.pendingBadge', {
              count: this.pendingCount(),
            })
          : null,
    },
    {
      route: '/workspace/members',
      icon: 'objects/person',
      labelKey: 'workspace.overview.members.label',
      roles: ['OWNER', 'ADMIN'],
      badgeText: () => null,
    },
    {
      route: '/workspace/teams',
      icon: 'objects/layers',
      labelKey: 'workspace.overview.teams.label',
      roles: ['OWNER', 'ADMIN', 'MANAGER'],
      badgeText: () => null,
    },
    {
      route: '/workspace/projects',
      icon: 'objects/folder',
      labelKey: 'workspace.overview.projects.label',
      roles: ['OWNER', 'ADMIN', 'MANAGER'],
      badgeText: () => null,
    },
    {
      route: '/workspace/time-entries',
      icon: 'objects/clock',
      labelKey: 'workspace.overview.timeEntries.label',
      roles: ['OWNER', 'ADMIN', 'MANAGER'],
      badgeText: () => null,
    },
  ];

  readonly navItems = computed(() => {
    const role = this.authTokenService.currentUser()?.companyRole;
    if (!role) return this.allNavItems;
    return this.allNavItems.filter((item) => item.roles.includes(role));
  });

  ngOnInit(): void {
    const companyId = this.companyId;
    if (!companyId) return;
    this.workspaceCompany.load(companyId);

    this.apiAdapter.executeRequest(this.companyApi.menuOverview(companyId), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.pendingCount.set(response.data.pendingMembershipsCount);
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });
  }

  // Na faixa de abas (< 1024px) só rola quando a aba ativa está cortada, centralizando-a.
  revealActive(isActive: boolean, tab: HTMLElement): void {
    const strip = tab.closest<HTMLElement>('.workspace-nav');
    if (!isActive || !strip || strip.scrollWidth <= strip.clientWidth) return;

    const stripRect = strip.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    if (tabRect.left >= stripRect.left && tabRect.right <= stripRect.right) return;

    const offset = tabRect.left - stripRect.left;
    strip.scrollTo({ left: strip.scrollLeft + offset - (strip.clientWidth - tab.offsetWidth) / 2 });
  }
}
