import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../../../../shared/components/pagination/pagination.component';
import { ApiAdapterService } from '../../../../../../shared/services/api/api-adapter.service';
import { DialogService } from '../../../../../../shared/services/dialog.service';
import { CompanyManagementApiService } from '../../../../services/company-management.api.service';
import { CompanyMemberOutput } from '../../../../models/company-management.model';
import { CompanyRole } from '../../../../../auth/models';
import { PageWrapper } from '../../../../../../shared/types';
import { AuthTokenService } from '../../../../../auth/services/auth-token.service';
import {
  InviteMemberDialogComponent,
  InviteMemberDialogResult,
} from '../../../../components/company/invite-member-dialog/invite-member-dialog.component';

@Component({
  selector: 'app-members-section',
  imports: [CommonModule, TranslatePipe, ButtonComponent, IconComponent, PaginationComponent],
  templateUrl: './members-section.component.html',
  styleUrl: './members-section.component.scss',
})
export class MembersSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private dialogService = inject(DialogService);
  private authTokenService = inject(AuthTokenService);
  private router = inject(Router);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  private get companyRole(): CompanyRole | null {
    return this.authTokenService.currentUser()?.companyRole ?? null;
  }

  navigateBack(): void {
    this.router.navigate(['/workspace']);
  }

  readonly members = signal<CompanyMemberOutput[]>([]);
  readonly page = signal<PageWrapper<CompanyMemberOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly inviting = signal(false);

  readonly canManage = (): boolean => {
    const role = this.companyRole;
    return role === 'OWNER' || role === 'ADMIN';
  };

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(pageNumber: number): void {
    if (!this.companyId) return;
    this.loading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listMembers(this.companyId, pageNumber, 10),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.page.set(response.data);
          this.members.set(response.data.content);
          this.currentPage.set(pageNumber);
          this.loading.set(false);
        },
        onError: () => this.loading.set(false),
      },
    );
  }

  openInviteDialog(): void {
    if (!this.companyId || !this.companyRole) return;

    const companyId = this.companyId;

    this.dialogService.openDialog<InviteMemberDialogComponent, InviteMemberDialogResult>(
      InviteMemberDialogComponent,
      {
        autoAdjustSize: true,
        data: { companyId, companyRole: this.companyRole },
        closeCallback: (result) => {
          if (!result?.confirmed) return;
          this.inviting.set(true);

          const request =
            result.action === 'invite'
              ? this.companyApi.inviteMember(companyId, { email: result.email, role: result.role })
              : this.companyApi.preRegisterAndInvite(companyId, {
                  email: result.email,
                  role: result.role,
                  name: result.name!,
                  phone: result.phone ?? null,
                  age: result.age ?? null,
                });

          this.apiAdapter.executeRequest(request, {
            ignoreLoading: true,
            onSuccess: () => {
              this.inviting.set(false);
              this.loadPage(this.currentPage());
            },
            onError: () => this.inviting.set(false),
          });
        },
      },
    );
  }
}
