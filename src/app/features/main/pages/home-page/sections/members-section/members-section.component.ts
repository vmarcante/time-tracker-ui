import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../../../../shared/components/pagination/pagination.component';
import { ApiAdapterService } from '../../../../../../shared/services/api/api-adapter.service';
import { CompanyManagementApiService } from '../../../../services/company-management.api.service';
import { CompanyMemberOutput } from '../../../../models/company-management.model';
import { CompanyRole } from '../../../../../auth/models';
import { PageWrapper } from '../../../../../../shared/types';

@Component({
  selector: 'app-members-section',
  imports: [CommonModule, TranslatePipe, ButtonComponent, IconComponent, PaginationComponent],
  templateUrl: './members-section.component.html',
  styleUrl: './members-section.component.scss',
})
export class MembersSectionComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);

  @Input() companyId: string | null = null;
  @Input() companyRole: CompanyRole | null = null;
  @Output() back = new EventEmitter<void>();

  readonly members = signal<CompanyMemberOutput[]>([]);
  readonly page = signal<PageWrapper<CompanyMemberOutput> | null>(null);
  readonly loading = signal(true);
  readonly currentPage = signal(1);

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


}
