import { Component, Input, Output, EventEmitter, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../../../../shared/components/icon/icon.component';
import { PopoverComponent } from '../../../../../../../shared/components/popover/popover.component';
import { ConfirmationDialogComponent } from '../../../../../../../shared/components/dialogs/confirmation/confirmation-dialog.component';
import { ApiAdapterService } from '../../../../../../../shared/services/api/api-adapter.service';
import { DialogService } from '../../../../../../../shared/services/dialog.service';
import { TranslationService } from '../../../../../../../shared/services/translation.service';
import { CompanyManagementApiService } from '../../../../../services/company-management.api.service';
import {
  CompanyMemberOutput,
  ProjectSummaryOutput,
  TeamDetailOutput,
  TeamMemberOutput,
} from '../../../../../models/company-management.model';
import { CompanyRole } from '../../../../../../auth/models';
import { SelectOption } from '../../../../../../../shared/types/input.types';
import { ConfirmationDialogConfiguration } from '../../../../../../../shared/types/dialog.types';

@Component({
  selector: 'app-team-detail',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    PopoverComponent,
  ],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.scss',
})
export class TeamDetailComponent implements OnInit {
  protected readonly String = String;

  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private dialogService = inject(DialogService);
  private translationService = inject(TranslationService);

  @Input() companyId!: string;
  @Input() companyRole: CompanyRole | null = null;
  @Input() currentUserId: string | null = null;
  @Input() team!: TeamDetailOutput;
  @Input() backLabelKey = 'workspace.section.back';
  @Output() back = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();
  @Output() editInfo = new EventEmitter<void>();

  readonly members = signal<TeamMemberOutput[]>([]);
  readonly membersLoading = signal(true);
  readonly projects = signal<ProjectSummaryOutput[]>([]);
  readonly projectsLoading = signal(true);

  readonly companyMembers = signal<CompanyMemberOutput[]>([]);
  readonly companyProjects = signal<ProjectSummaryOutput[]>([]);
  readonly processing = signal(false);

  private memberAddPopover = viewChild<PopoverComponent>('memberAdd');
  private projectAddPopover = viewChild<PopoverComponent>('projectAdd');

  /** projectId → userIds alocados nesse projeto via ESTE time. */
  readonly projectMemberIds = signal<Map<string, Set<string>>>(new Map());

  /** projectId → membros do time alocados nele (stack de avatares). */
  readonly teamMembersByProject = computed(() => {
    const memberIds = this.projectMemberIds();
    const members = this.members();
    const result = new Map<string, TeamMemberOutput[]>();
    for (const [projectId, userIds] of memberIds) {
      result.set(
        projectId,
        members.filter((member) => userIds.has(member.userId)),
      );
    }
    return result;
  });

  readonly canManageCompany = computed(
    () => this.companyRole === 'OWNER' || this.companyRole === 'ADMIN',
  );

  readonly isTeamLead = computed(() =>
    this.members().some((m) => m.userId === this.currentUserId && m.role === 'LEAD'),
  );

  readonly isMember = computed(() =>
    this.members().some((m) => m.userId === this.currentUserId),
  );

  readonly canManageMembers = computed(() => this.canManageCompany() || this.isTeamLead());

  readonly companyRoleByUserId = computed(() => {
    const map = new Map<string, CompanyRole>();
    for (const member of this.companyMembers()) {
      map.set(member.userId, member.role);
    }
    return map;
  });

  readonly companyEmailByUserId = computed(() => {
    const map = new Map<string, string>();
    for (const member of this.companyMembers()) {
      if (member.email) {
        map.set(member.userId, member.email);
      }
    }
    return map;
  });

  readonly memberCandidates = computed<SelectOption[]>(() => {
    const memberIds = new Set(this.members().map((m) => m.userId));
    return this.companyMembers()
      .filter((m) => m.approved && m.active && m.email && !memberIds.has(m.userId))
      .map((m) => ({ value: m.userId, label: m.name }));
  });

  readonly projectCandidates = computed<SelectOption[]>(() => {
    const linkedIds = new Set(this.projects().map((p) => p.id));
    return this.companyProjects()
      .filter((p) => p.status === 'ACTIVE' && !linkedIds.has(p.id))
      .map((p) => ({ value: p.id, label: p.name }));
  });

  ngOnInit(): void {
    this.loadMembers();
    this.loadProjects();
    this.loadCompanyMembers();
    if (this.canManageCompany()) {
      this.loadCompanyProjects();
    }
  }

  loadMembers(): void {
    this.membersLoading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listTeamMembers(this.companyId, this.team.id),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.members.set(response.data.content);
          this.membersLoading.set(false);
        },
        onError: () => this.membersLoading.set(false),
      },
    );
  }

  loadProjects(): void {
    this.projectsLoading.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.listTeamProjects(this.companyId, this.team.id),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.projects.set(response.data.content);
          this.projectsLoading.set(false);
          this.loadProjectMembers(response.data.content);
        },
        onError: () => this.projectsLoading.set(false),
      },
    );
  }

  /** Carrega as alocações de cada projeto e filtra as feitas via este time. */
  private loadProjectMembers(projects: ProjectSummaryOutput[]): void {
    this.projectMemberIds.set(new Map());
    for (const project of projects) {
      this.apiAdapter.executeRequest(
        this.companyApi.listProjectMembers(this.companyId, project.id),
        {
          ignoreLoading: true,
          onSuccess: (response) => {
            const userIds = new Set(
              response.data.content
                .filter((assignment) => assignment.teamId === this.team.id)
                .map((assignment) => assignment.userId),
            );
            this.projectMemberIds.update(
              (map) => new Map(map).set(project.id, userIds),
            );
          },
        },
      );
    }
  }

  private loadCompanyMembers(): void {
    this.apiAdapter.executeRequest(
      this.companyApi.listMembers(this.companyId, 1, 100),
      {
        ignoreLoading: true,
        onSuccess: (response) => this.companyMembers.set(response.data.content),
      },
    );
  }

  private loadCompanyProjects(): void {
    this.apiAdapter.executeRequest(
      this.companyApi.listProjects(this.companyId, 1, 100),
      {
        ignoreLoading: true,
        onSuccess: (response) => this.companyProjects.set(response.data.content),
      },
    );
  }

  isSelf(member: TeamMemberOutput): boolean {
    return member.userId === this.currentUserId;
  }

  canPromoteToLead(member: TeamMemberOutput): boolean {
    return (
      this.canManageCompany() &&
      member.role !== 'LEAD' &&
      this.companyRoleByUserId().get(member.userId) === 'MANAGER' &&
      !!this.companyEmailByUserId().get(member.userId)
    );
  }

  addMember(userId: string): void {
    const email = this.companyEmailByUserId().get(userId);
    if (!email || this.processing()) return;

    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.addTeamMember(this.companyId, this.team.id, email),
      {
        ignoreLoading: true,
        onSuccess: () => {
          this.processing.set(false);
          this.memberAddPopover()?.close();
          this.loadMembers();
          this.changed.emit();
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  removeMember(member: TeamMemberOutput): void {
    if (this.processing()) return;
    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.teamMemberRemovalImpact(this.companyId, this.team.id, member.membershipId),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.processing.set(false);
          this.confirmMemberRemoval(member, response.data);
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  private confirmMemberRemoval(member: TeamMemberOutput, impact: { projectName: string }[]): void {
    const messageKey = impact.length > 0
      ? 'workspace.teams.detail.members.remove.messageWithImpact'
      : 'workspace.teams.detail.members.remove.message';
    const message = this.translationService.translate(messageKey, {
      name: member.name,
      count: impact.length,
    });

    this.openConfirmation(
      'workspace.teams.detail.members.remove.title',
      message,
      'workspace.teams.detail.members.remove.confirm',
      'error',
      () => this.executeRemoveMember(member),
    );
  }

  private executeRemoveMember(member: TeamMemberOutput): void {
    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.removeTeamMember(this.companyId, this.team.id, member.membershipId),
      {
        ignoreLoading: true,
        onSuccess: () => {
          this.processing.set(false);
          this.loadMembers();
          this.changed.emit();
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  promoteToLead(member: TeamMemberOutput): void {
    const email = this.companyEmailByUserId().get(member.userId);
    if (!email || this.processing()) return;

    const message = this.translationService.translate(
      'workspace.teams.detail.members.lead.message',
      { name: member.name },
    );

    this.openConfirmation(
      'workspace.teams.detail.members.lead.title',
      message,
      'workspace.teams.detail.members.lead.confirm',
      'primary',
      () => this.executeAssignLead(email),
    );
  }

  private executeAssignLead(email: string): void {
    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.assignTeamLead(this.companyId, this.team.id, email),
      {
        ignoreLoading: true,
        onSuccess: () => {
          this.processing.set(false);
          this.loadMembers();
          this.changed.emit();
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  leaveTeam(): void {
    if (this.processing()) return;
    const message = this.translationService.translate('workspace.teams.detail.leave.message', {
      team: this.team.name,
    });

    this.openConfirmation(
      'workspace.teams.detail.leave.title',
      message,
      'workspace.teams.detail.leave.confirm',
      'error',
      () => this.executeLeaveTeam(),
    );
  }

  private executeLeaveTeam(): void {
    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.leaveTeam(this.companyId, this.team.id),
      {
        ignoreLoading: true,
        onSuccess: () => {
          this.processing.set(false);
          this.changed.emit();
          this.back.emit();
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  linkProject(projectId: string): void {
    if (!projectId || this.processing()) return;

    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.linkProjectToTeam(this.companyId, projectId, this.team.id),
      {
        ignoreLoading: true,
        onSuccess: () => {
          this.processing.set(false);
          this.projectAddPopover()?.close();
          this.loadProjects();
          this.changed.emit();
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  unlinkProject(project: ProjectSummaryOutput): void {
    if (this.processing()) return;
    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.projectUnlinkImpact(this.companyId, project.id, this.team.id),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.processing.set(false);
          this.confirmProjectUnlink(project, response.data.length);
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  private confirmProjectUnlink(project: ProjectSummaryOutput, impactCount: number): void {
    const messageKey = impactCount > 0
      ? 'workspace.teams.detail.projects.unlink.messageWithImpact'
      : 'workspace.teams.detail.projects.unlink.message';
    const message = this.translationService.translate(messageKey, {
      project: project.name,
      count: impactCount,
    });

    this.openConfirmation(
      'workspace.teams.detail.projects.unlink.title',
      message,
      'workspace.teams.detail.projects.unlink.confirm',
      'error',
      () => this.executeUnlinkProject(project),
    );
  }

  private executeUnlinkProject(project: ProjectSummaryOutput): void {
    this.processing.set(true);
    this.apiAdapter.executeRequest(
      this.companyApi.unlinkProjectFromTeam(this.companyId, project.id, this.team.id),
      {
        ignoreLoading: true,
        onSuccess: () => {
          this.processing.set(false);
          this.loadProjects();
          this.changed.emit();
        },
        onError: () => this.processing.set(false),
      },
    );
  }

  private openConfirmation(
    titleKey: string,
    message: string,
    confirmKey: string,
    confirmColor: 'primary' | 'error',
    onConfirm: () => void,
  ): void {
    const config: ConfirmationDialogConfiguration = {
      title: this.translationService.translate(titleKey),
      message,
      buttons: {
        cancel: {
          show: true,
          text: this.translationService.translate('common.dialog.cancel'),
          order: 1,
          name: 'cancel',
          color: 'secondary',
        },
        confirmation: {
          show: true,
          text: this.translationService.translate(confirmKey),
          order: 2,
          name: 'confirm',
          color: confirmColor,
        },
      },
    };

    this.dialogService.openDialog<ConfirmationDialogComponent, { confirm?: boolean }>(
      ConfirmationDialogComponent,
      {
        width: '480px',
        data: config,
        closeCallback: (result) => {
          if (result?.confirm) onConfirm();
        },
      },
    );
  }
}
