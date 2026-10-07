import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../../../../shared/components/pagination/pagination.component';
import { ApiAdapterService } from '../../../../../../shared/services/api/api-adapter.service';
import { DialogService } from '../../../../../../shared/services/dialog.service';
import { CompanyManagementApiService } from '../../../../services/company-management.api.service';
import {
  RejectMembershipDialogComponent,
  RejectMembershipDialogResult,
} from '../../../../components/company/reject-membership-dialog/reject-membership-dialog.component';
import { CompanyMemberOutput } from '../../../../models/company-management.model';
import { ApiResponse, PageWrapper } from '../../../../../../shared/types';

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

  @Input() companyId: string | null = null;
  @Output() back = new EventEmitter<void>();

  // Pending
  readonly pending = signal<CompanyMemberOutput[]>([]);
  readonly pendingPage = signal<PageWrapper<CompanyMemberOutput> | null>(null);
  readonly pendingLoading = signal(true);
  readonly pendingCurrentPage = signal(1);
  readonly processingId = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);

  // Resolved (history)
  readonly resolved = signal<CompanyMemberOutput[]>([]);
  readonly resolvedPage = signal<PageWrapper<CompanyMemberOutput> | null>(null);
  readonly resolvedLoading = signal(true);
  readonly resolvedCurrentPage = signal(1);

  ngOnInit(): void {
    this.loadPending(1);
    this.loadResolved(1);
  }

  loadPending(pageNumber: number): void {
    if (!this.companyId) return;
    this.pendingLoading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listPending(this.companyId, pageNumber, 10),
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
    this.resolve(member, () => this.companyApi.approveMembership(this.companyId!, member.membershipId));
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
