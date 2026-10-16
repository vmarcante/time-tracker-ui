import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { CheckboxInputComponent } from '../../../../shared/components/inputs/checkbox/checkbox-input.component';
import { PopoverComponent } from '../../../../shared/components/popover/popover.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import {
  CompanyMemberOutput,
  TeamMemberOutput,
  TeamWithMembersOutput,
} from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';

interface FlatResult {
  userId: string;
  name: string;
  team: TeamWithMembersOutput | null;
}

/**
 * Filtro composto de pessoas/times — popover colapsável com busca flat,
 * accordion de times e checkboxes granulares. Emite união (membros OU times).
 */
@Component({
  selector: 'app-people-filter',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TextInputComponent,
    CheckboxInputComponent,
    PopoverComponent,
    IconComponent,
  ],
  templateUrl: './people-filter.component.html',
  styleUrl: './people-filter.component.scss',
})
export class PeopleFilterComponent implements OnInit {
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);
  private destroyRef = inject(DestroyRef);

  /** companyId explícito (overview já conhece); sem ele, resolve via usuário logado. */
  readonly companyId = input<string | null>(null);

  /** União efetiva: membros selecionados individualmente OU membros dos times marcados. */
  readonly selectionChange = output<{ userIds: string[]; teamIds: string[] }>();

  readonly teamsWithMembers = signal<TeamWithMembersOutput[]>([]);
  readonly unassignedMembers = signal<TeamMemberOutput[]>([]);
  readonly expandedTeamIds = signal<ReadonlySet<string>>(new Set());
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly search = signal('');
  private readonly selectionVersion = signal(0);
  private teamControls = new Map<string, FormControl<boolean>>();
  private memberControls = new Map<string, FormControl<boolean>>();
  private teamOfMember = new Map<string, string>();

  readonly selectedTeamIds = computed<Set<string>>(() => {
    this.selectionVersion();
    const selected = new Set<string>();
    this.teamControls.forEach((control, id) => {
      if (control.value) selected.add(id);
    });
    return selected;
  });

  /** Membros selecionados individualmente — exclui os já cobertos por time marcado. */
  readonly selectedMemberIds = computed<Set<string>>(() => {
    this.selectionVersion();
    const teams = this.selectedTeamIds();
    const selected = new Set<string>();
    this.memberControls.forEach((control, userId) => {
      const teamId = this.teamOfMember.get(userId);
      if (control.value && !(teamId && teams.has(teamId))) {
        selected.add(userId);
      }
    });
    return selected;
  });

  readonly selectionCount = computed(
    () => this.selectedTeamIds().size + this.selectedMemberIds().size,
  );
  readonly hasSelection = computed(() => this.selectionCount() > 0);
  readonly searchActive = computed(() => this.search().trim().length > 0);

  /** Busca flat: membros (e times cujo nome bate) numa lista única. */
  readonly flatResults = computed<FlatResult[]>(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return [];
    const results: FlatResult[] = [];
    for (const team of this.teamsWithMembers()) {
      const teamHit = team.name.toLowerCase().includes(q);
      for (const member of team.members) {
        if (teamHit || member.name.toLowerCase().includes(q)) {
          results.push({ userId: member.userId, name: member.name, team });
        }
      }
    }
    for (const member of this.unassignedMembers()) {
      if (member.name.toLowerCase().includes(q)) {
        results.push({ userId: member.userId, name: member.name, team: null });
      }
    }
    return results;
  });

  private get effectiveCompanyId(): string | null {
    return this.companyId() ?? this.authTokenService.currentUser()?.companyId ?? null;
  }

  ngOnInit(): void {
    this.loadOptions();
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.search.set(value ?? ''));
  }

  teamControlOf(teamId: string): FormControl<boolean> {
    let control = this.teamControls.get(teamId);
    if (!control) {
      control = new FormControl<boolean>(false, { nonNullable: true });
      this.teamControls.set(teamId, control);
    }
    return control;
  }

  memberControlOf(userId: string): FormControl<boolean> {
    let control = this.memberControls.get(userId);
    if (!control) {
      control = new FormControl<boolean>(false, { nonNullable: true });
      this.memberControls.set(userId, control);
    }
    return control;
  }

  isTeamExpanded(teamId: string): boolean {
    return this.expandedTeamIds().has(teamId);
  }

  toggleTeamExpanded(teamId: string): void {
    const next = new Set(this.expandedTeamIds());
    if (next.has(teamId)) next.delete(teamId);
    else next.add(teamId);
    this.expandedTeamIds.set(next);
  }

  isTeamSelected(teamId: string): boolean {
    return this.selectedTeamIds().has(teamId);
  }

  isTeamIndeterminate(team: TeamWithMembersOutput): boolean {
    if (this.isTeamSelected(team.id)) return false;
    const count = this.selectedMemberCount(team);
    return count > 0 && count < team.members.length;
  }

  selectedMemberCount(team: TeamWithMembersOutput): number {
    if (this.isTeamSelected(team.id)) return team.members.length;
    return team.members.filter((m) => this.memberControls.get(m.userId)?.value).length;
  }

  onTeamToggle(team: TeamWithMembersOutput, checked: unknown): void {
    const isChecked = checked === true;
    this.teamControlOf(team.id).setValue(isChecked);
    for (const member of team.members) {
      this.memberControlOf(member.userId).setValue(isChecked);
    }
    if (isChecked && !this.isTeamExpanded(team.id)) {
      this.toggleTeamExpanded(team.id);
    }
    this.emitSelection();
  }

  onMemberToggle(team: TeamWithMembersOutput | null): void {
    if (team) {
      const allChecked = team.members.every((m) => this.memberControlOf(m.userId).value);
      this.teamControlOf(team.id).setValue(allChecked);
    }
    this.emitSelection();
  }

  clearSelection(): void {
    this.teamControls.forEach((c) => c.setValue(false));
    this.memberControls.forEach((c) => c.setValue(false));
    this.emitSelection();
  }

  private emitSelection(): void {
    this.selectionVersion.update((v) => v + 1);
    this.selectionChange.emit({
      userIds: [...this.selectedMemberIds()],
      teamIds: [...this.selectedTeamIds()],
    });
  }

  private loadOptions(): void {
    const companyId = this.effectiveCompanyId;
    if (!companyId) return;
    this.apiAdapter.executeRequest(this.companyApi.listTeamsWithMembers(companyId), {
      ignoreLoading: true,
      onSuccess: (response) => {
        const teams = response.data;
        this.teamsWithMembers.set(teams);
        this.teamOfMember.clear();
        for (const team of teams) {
          for (const member of team.members) {
            this.teamOfMember.set(member.userId, team.id);
          }
        }
        this.loadUnassignedMembers(companyId, teams);
      },
    });
  }

  /** Membros aprovados que não pertencem a nenhum time — viram um grupo "Sem time". */
  private loadUnassignedMembers(companyId: string, teams: TeamWithMembersOutput[]): void {
    this.apiAdapter.executeRequest(this.companyApi.listMembers(companyId, 1, 200), {
      ignoreLoading: true,
      onSuccess: (response) => {
        const assigned = new Set(teams.flatMap((t) => t.members.map((m) => m.userId)));
        this.unassignedMembers.set(
          response.data.content
            .filter((m: CompanyMemberOutput) => m.approved && m.active && !assigned.has(m.userId))
            .map((m: CompanyMemberOutput) => ({
              membershipId: m.membershipId,
              userId: m.userId,
              name: m.name,
              role: 'MEMBER' as const,
              createdAt: '',
            })),
        );
      },
    });
  }
}
