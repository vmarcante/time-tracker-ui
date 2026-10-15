import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea/textarea-input.component';
import { DaterangeInputComponent } from '../../../../shared/components/inputs/daterange/daterange-input.component';
import { CheckboxInputComponent } from '../../../../shared/components/inputs/checkbox/checkbox-input.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import {
  ProjectDetailOutput,
  ProjectTeamMembersInput,
  TeamWithMembersOutput,
} from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';
import { CompanyRole } from '../../../auth/models/person.model';

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatIsoDate(value: unknown): string | null {
  if (!(value instanceof Date) || isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('start')?.value;
  const end = group.get('end')?.value;
  if (start instanceof Date && end instanceof Date && end.getTime() < start.getTime()) {
    return { invalidRange: true };
  }
  return null;
}

@Component({
  selector: 'app-project-edit-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    TextInputComponent,
    TextareaInputComponent,
    DaterangeInputComponent,
    CheckboxInputComponent,
  ],
  templateUrl: './project-edit-page.component.html',
  styleUrl: './project-edit-page.component.scss',
})
export class ProjectEditPageComponent implements OnInit {
  private router = inject(Router);
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private translationService = inject(TranslationService);

  private get companyId(): string | null {
    return this.authTokenService.currentUser()?.companyId ?? null;
  }

  private get companyRole(): CompanyRole | null {
    return this.authTokenService.currentUser()?.companyRole ?? null;
  }

  readonly project = signal<ProjectDetailOutput | null>(null);
  readonly teams = signal<TeamWithMembersOutput[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly saving = signal(false);

  readonly canEdit = computed(() => {
    const role = this.companyRole;
    return role === 'OWNER' || role === 'ADMIN';
  });

  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });
  readonly clientNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });
  readonly descriptionControl = new FormControl('', { nonNullable: true });
  readonly datesGroup = new FormGroup(
    {
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    },
    { validators: [dateRangeValidator] },
  );

  readonly dateErrorMessages: Record<string, string> = {
    invalidRange: this.translationService.translate('workspace.projects.dialog.dates.invalidRange'),
  };

  readonly teamControls = new Map<string, FormControl<boolean>>();
  readonly memberControls = new Map<string, FormControl<boolean>>();

  ngOnInit(): void {
    const projectId = (history.state as { projectId?: string } | null)?.projectId;
    const companyId = this.companyId;
    if (!projectId || !companyId) {
      this.navigateBack();
      return;
    }
    this.loadProject(companyId, projectId);
  }

  private async loadProject(companyId: string, projectId: string): Promise<void> {
    this.loading.set(true);
    try {
      const [projectResponse, teamsResponse, linkedResponse, membersResponse] =
        await this.apiAdapter.executeForkJoinWithPromise(
          [
            this.companyApi.findProject(companyId, projectId),
            this.companyApi.listTeamsWithMembers(companyId),
            this.companyApi.listProjectTeams(companyId, projectId, 1, 100),
            this.companyApi.listProjectMembers(companyId, projectId, 1, 100),
          ],
          { ignoreLoading: true },
        );

      const linkedTeamIds = new Set(linkedResponse.data.content.map((team) => team.id));
      const memberIdsByTeam = new Map<string, Set<string>>();
      for (const assignment of membersResponse.data.content) {
        const list = memberIdsByTeam.get(assignment.teamId) ?? new Set<string>();
        list.add(assignment.userId);
        memberIdsByTeam.set(assignment.teamId, list);
      }

      this.project.set(projectResponse.data);
      this.teams.set(teamsResponse.data);
      this.buildControls(projectResponse.data, teamsResponse.data, linkedTeamIds, memberIdsByTeam);
      this.loading.set(false);
    } catch {
      this.loading.set(false);
      this.notFound.set(true);
    }
  }

  private buildControls(
    project: ProjectDetailOutput,
    teams: TeamWithMembersOutput[],
    linkedTeamIds: Set<string>,
    memberIdsByTeam: Map<string, Set<string>>,
  ): void {
    this.nameControl.setValue(project.name);
    this.clientNameControl.setValue(project.clientName ?? '');
    this.descriptionControl.setValue(project.description ?? '');
    this.datesGroup.setValue({
      start: parseIsoDate(project.startDate),
      end: parseIsoDate(project.endDate),
    });

    const editable = this.canEdit();
    for (const team of teams) {
      const teamSelected = linkedTeamIds.has(team.id);
      const teamControl = new FormControl<boolean>(teamSelected, { nonNullable: true });
      if (!editable) teamControl.disable();
      this.teamControls.set(team.id, teamControl);

      const linkedMembers = memberIdsByTeam.get(team.id) ?? new Set<string>();
      for (const member of team.members) {
        const memberControl = new FormControl<boolean>(linkedMembers.has(member.userId), {
          nonNullable: true,
        });
        if (!editable) memberControl.disable();
        this.memberControls.set(this.memberKey(team.id, member.userId), memberControl);
      }
    }

    if (!editable) {
      this.nameControl.disable();
      this.clientNameControl.disable();
      this.descriptionControl.disable();
      this.datesGroup.disable();
    }
  }

  private memberKey(teamId: string, userId: string): string {
    return `${teamId}:${userId}`;
  }

  teamControlOf(teamId: string): FormControl<boolean> {
    return this.teamControls.get(teamId)!;
  }

  memberControlOf(teamId: string, userId: string): FormControl<boolean> {
    return this.memberControls.get(this.memberKey(teamId, userId))!;
  }

  isTeamSelected(teamId: string): boolean {
    return this.teamControls.get(teamId)?.value === true;
  }

  onTeamToggle(team: TeamWithMembersOutput, checked: unknown): void {
    const isChecked = checked === true;
    for (const member of team.members) {
      this.memberControls.get(this.memberKey(team.id, member.userId))?.setValue(isChecked);
    }
  }

  navigateBack(): void {
    this.router.navigate(['/workspace/projects']);
  }

  save(): void {
    const project = this.project();
    const companyId = this.companyId;
    if (!project || !companyId || this.saving() || !this.canEdit()) {
      return;
    }

    this.nameControl.markAsTouched();
    this.clientNameControl.markAsTouched();
    this.descriptionControl.markAsTouched();
    this.datesGroup.markAllAsTouched();

    if (!this.nameControl.valid || !this.clientNameControl.valid || !this.datesGroup.valid) {
      return;
    }

    const description = this.descriptionControl.value.trim();
    const input = {
      name: this.nameControl.value.trim(),
      clientName: this.clientNameControl.value.trim(),
      description: description.length > 0 ? description : null,
      startDate: formatIsoDate(this.datesGroup.get('start')?.value),
      endDate: formatIsoDate(this.datesGroup.get('end')?.value),
      teams: this.buildTeamsPayload(),
    };

    this.saving.set(true);
    this.apiAdapter.executeRequest(this.companyApi.updateProject(companyId, project.id, input), {
      onSuccess: () => {
        this.saving.set(false);
        this.navigateBack();
      },
      onError: () => this.saving.set(false),
    });
  }

  private buildTeamsPayload(): ProjectTeamMembersInput[] {
    return this.teams()
      .filter((team) => this.isTeamSelected(team.id))
      .map((team) => ({
        teamId: team.id,
        memberIds: team.members
          .filter(
            (member) =>
              this.memberControls.get(this.memberKey(team.id, member.userId))?.value === true,
          )
          .map((member) => member.userId),
      }));
  }
}
