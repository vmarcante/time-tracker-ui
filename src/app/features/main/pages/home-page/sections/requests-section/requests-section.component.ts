import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../../../../shared/components/pagination/pagination.component';
import { ApiAdapterService } from '../../../../../../shared/services/api/api-adapter.service';
import { DialogService } from '../../../../../../shared/services/dialog.service';
import { ToastrService } from '../../../../../../shared/services/toastr.service';
import { TranslationService } from '../../../../../../shared/services/translation.service';
import { ConfirmationDialogComponent } from '../../../../../../shared/components/dialogs/confirmation/confirmation-dialog.component';
import { ConfirmationDialogConfiguration } from '../../../../../../shared/types';
import { CompanyManagementApiService } from '../../../../services/company-management.api.service';
import {
  RejectMembershipDialogComponent,
  RejectMembershipDialogResult,
} from '../../../../components/company/reject-membership-dialog/reject-membership-dialog.component';
import { CompanyMemberOutput } from '../../../../models/company-management.model';
import { ApiResponse, PageWrapper } from '../../../../../../shared/types';
import { AuthTokenService } from '../../../../../auth/services/auth-token.service';

export type RequestStatus = 'APPROVED' | 'REJECTED' | 'DECLINED';

@Component({
  selector: 'app-requests-section',
  imports: [CommonModule, TranslatePipe, ButtonComponent, IconComponent, PaginationComponent],
  templateUrl: './requests-section.component.html',
  styleUrl: './requests-section.component.scss',
})
export class RequestsSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private dialogService = inject(DialogService);
  private translationService = inject(TranslationService);
  private toastr = inject(ToastrService);
  private authTokenService = inject(AuthTokenService);
  private router = inject(Router);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  navigateBack(): void {
    this.router.navigate(['/workspace']);
  }

  // Pending requests (people asking to join)
  readonly pending = signal<CompanyMemberOutput[]>([]);
  readonly pendingPage = signal<PageWrapper<CompanyMemberOutput> | null>(null);
  readonly pendingLoading = signal(true);
  readonly pendingCurrentPage = signal(1);
  readonly processingId = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);

  // Pending invites (sent by the company, awaiting the invitee)
  readonly invites = signal<CompanyMemberOutput[]>([]);
  readonly invitesPage = signal<PageWrapper<CompanyMemberOutput> | null>(null);
  readonly invitesLoading = signal(true);
  readonly invitesCurrentPage = signal(1);

  // Resolved (history)
  readonly resolved = signal<CompanyMemberOutput[]>([]);
  readonly resolvedPage = signal<PageWrapper<CompanyMemberOutput> | null>(null);
  readonly resolvedLoading = signal(true);
  readonly resolvedCurrentPage = signal(1);

  ngOnInit(): void {
    this.loadPending(1);
    this.loadInvites(1);
    this.loadResolved(1);
  }

  loadPending(pageNumber: number): void {
    if (!this.companyId) return;
    this.pendingLoading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listPending(this.companyId, pageNumber, 10, 'REQUEST'),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.pendingPage.set(response.data);
          this.pending.set(response.data.content);
          this.pendingCurrentPage.set(pageNumber);
          this.pendingLoading.set(false);
        },
        onError: () => this.pendingLoading.set(false),
      },
    );
  }

  loadResolved(pageNumber: number): void {
    if (!this.companyId) return;
    this.resolvedLoading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listResolved(this.companyId, pageNumber, 10),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.resolvedPage.set(response.data);
          this.resolved.set(response.data.content);
          this.resolvedCurrentPage.set(pageNumber);
          this.resolvedLoading.set(false);
        },
        onError: () => this.resolvedLoading.set(false),
      },
    );
  }

  toggleDetails(membershipId: string): void {
    this.expandedId.update((current) => (current === membershipId ? null : membershipId));
  }

  approve(member: CompanyMemberOutput): void {
    const dialogData: ConfirmationDialogConfiguration = {
      title: this.translationService.translate('workspace.requests.approveDialog.title'),
      message: this.translationService.translate('workspace.requests.approveDialog.message', {
        name: member.name,
      }),
      closeable: true,
      buttons: {
        cancel: {
          show: true,
          text: this.translationService.translate('workspace.requests.approveDialog.cancel'),
          order: 1,
          name: 'cancel',
          color: 'outline-white',
        },
        confirmation: {
          show: true,
          text: this.translationService.translate('workspace.requests.approveDialog.confirm'),
          order: 2,
          name: 'confirm',
          color: 'success',
        },
      },
    };

    this.dialogService.openDialog<ConfirmationDialogComponent, { confirm?: boolean }>(
      ConfirmationDialogComponent,
      {
        width: '480px',
        data: dialogData,
        closeCallback: (result) => {
          if (!result?.confirm) return;
          this.resolve(member, () =>
            this.companyApi.approveMembership(this.companyId!, member.membershipId),
          );
        },
      },
    );
  }

  reject(member: CompanyMemberOutput): void {
    this.dialogService.openDialog<RejectMembershipDialogComponent, RejectMembershipDialogResult>(
      RejectMembershipDialogComponent,
      {
        width: '480px',
        data: { memberName: member.name },
        closeCallback: (result) => {
          if (!result?.confirmed) return;
          this.resolve(member, () =>
            this.companyApi.rejectMembership(
              this.companyId!,
              member.membershipId,
              result.rejectionReason,
            ),
          );
        },
      },
    );
  }

  loadInvites(pageNumber: number): void {
    if (!this.companyId) return;
    this.invitesLoading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listPending(this.companyId, pageNumber, 10, 'INVITE'),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.invitesPage.set(response.data);
          this.invites.set(response.data.content);
          this.invitesCurrentPage.set(pageNumber);
          this.invitesLoading.set(false);
        },
        onError: () => this.invitesLoading.set(false),
      },
    );
  }

  cancelInvite(member: CompanyMemberOutput): void {
    const dialogData: ConfirmationDialogConfiguration = {
      title: this.translationService.translate('workspace.requests.cancelDialog.title'),
      message: this.translationService.translate('workspace.requests.cancelDialog.message', {
        name: member.name,
      }),
      closeable: true,
      buttons: {
        cancel: {
          show: true,
          text: this.translationService.translate('workspace.requests.cancelDialog.cancel'),
          order: 1,
          name: 'cancel',
          color: 'outline-white',
        },
        confirmation: {
          show: true,
          text: this.translationService.translate('workspace.requests.cancelDialog.confirm'),
          order: 2,
          name: 'confirm',
          color: 'error',
        },
      },
    };

    this.dialogService.openDialog<ConfirmationDialogComponent, { confirm?: boolean }>(
      ConfirmationDialogComponent,
      {
        width: '480px',
        data: dialogData,
        closeCallback: (result) => {
          if (!result?.confirm) return;
          if (!this.companyId) return;
          this.processingId.set(member.membershipId);
          this.apiAdapter.executeRequest(
            this.companyApi.cancelInvite(this.companyId, member.membershipId),
            {
              ignoreLoading: true,
              onSuccess: () => {
                this.processingId.set(null);
                this.invites.update((list) =>
                  list.filter((m) => m.membershipId !== member.membershipId),
                );
                this.toastr.successMessage(
                  this.translationService.translate('workspace.requests.cancelSuccess'),
                );
                this.loadResolved(1);
              },
              onError: () => this.processingId.set(null),
            },
          );
        },
      },
    );
  }

  resendInvite(member: CompanyMemberOutput): void {
    if (!this.companyId) return;
    this.processingId.set(member.membershipId);
    this.apiAdapter.executeRequest(
      this.companyApi.resendInvite(this.companyId, member.membershipId),
      {
        ignoreLoading: true,
        onSuccess: () => {
          this.processingId.set(null);
          this.toastr.successMessage(
            this.translationService.translate('workspace.requests.resendSuccess'),
          );
        },
        onError: () => this.processingId.set(null),
      },
    );
  }

  private resolve(member: CompanyMemberOutput, action: () => ApiResponse<CompanyMemberOutput | void>): void {
    if (!this.companyId) return;
    this.processingId.set(member.membershipId);
    this.apiAdapter.executeRequest(action(), {
      ignoreLoading: true,
      onSuccess: () => {
        this.processingId.set(null);
        this.pending.update((list) => list.filter((m) => m.membershipId !== member.membershipId));
        this.loadResolved(1);
      },
      onError: () => this.processingId.set(null),
    });
  }

  statusOf(member: CompanyMemberOutput): RequestStatus {
    if (member.approved) return 'APPROVED';
    return member.origin === 'REQUEST' ? 'REJECTED' : 'DECLINED';
  }

  resolvedAt(member: CompanyMemberOutput): string | null {
    return member.approvedAt ?? member.updatedAt;
  }

  resolvedBy(member: CompanyMemberOutput): string | null {
    return member.approvedByName ?? member.updatedByName;
  }
}
