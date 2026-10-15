import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import { CompanyOverviewOutput } from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { CompanyRole } from '../../../auth/models/person.model';

interface OverviewCard {
  labelKey: string;
  hintKey: string;
  ariaKey: string;
  icon: string;
  route: string | null;
  count: () => number;
  alert: () => boolean;
}

@Component({
  selector: 'app-workspace-overview',
  imports: [CommonModule, RouterLink, TranslatePipe, IconComponent],
  templateUrl: './workspace-overview.component.html',
  styleUrl: './workspace-overview.component.scss',
})
export class WorkspaceOverviewComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);

  readonly overview = signal<CompanyOverviewOutput | null>(null);
  readonly loading = signal(true);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  get canSeeMembers(): boolean {
    const role = this.authTokenService.currentUser()?.companyRole;
    return role === 'OWNER' || role === 'ADMIN';
  }

  readonly cards = computed<OverviewCard[]>(() => {
    const data = this.overview();
    return [
      {
        labelKey: 'workspace.overview.requests.label',
        hintKey: 'workspace.overview.requests.hint.waiting',
        ariaKey: 'workspace.overview.requests.aria',
        icon: 'objects/inbox',
        route: '/workspace/requests',
        count: () => data?.pendingMembershipsCount ?? 0,
        alert: () => (data?.pendingMembershipsCount ?? 0) > 0,
      },
      {
        labelKey: 'workspace.overview.members.label',
        hintKey: 'workspace.overview.members.hint',
        ariaKey: 'workspace.overview.members.aria',
        icon: 'objects/person',
        route: this.canSeeMembers ? '/workspace/members' : null,
        count: () => data?.membersCount ?? 0,
        alert: () => false,
      },
      {
        labelKey: 'workspace.overview.teams.label',
        hintKey: 'workspace.overview.teams.hint',
        ariaKey: 'workspace.overview.teams.aria',
        icon: 'objects/layers',
        route: '/workspace/teams',
        count: () => data?.teamsCount ?? 0,
        alert: () => false,
      },
      {
        labelKey: 'workspace.overview.projects.label',
        hintKey: 'workspace.overview.projects.hint',
        ariaKey: 'workspace.overview.projects.aria',
        icon: 'objects/folder',
        route: '/workspace/projects',
        count: () => data?.projectsCount ?? 0,
        alert: () => false,
      },
    ];
  });

  ngOnInit(): void {
    const companyId = this.companyId;
    if (!companyId) {
      this.loading.set(false);
      return;
    }

    this.apiAdapter.executeRequest(this.companyApi.overview(companyId), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.overview.set(response.data);
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });
  }

  roleLabel(role: CompanyRole): string {
    return `workspace.members.role.${role}`;
  }
}
