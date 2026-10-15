import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../../shared/components/inputs/text/text-input.component';
import { TextareaInputComponent } from '../../../../../shared/components/inputs/textarea/textarea-input.component';
import { DaterangeInputComponent } from '../../../../../shared/components/inputs/daterange/daterange-input.component';
import { CheckboxInputComponent } from '../../../../../shared/components/inputs/checkbox/checkbox-input.component';
import { DialogShellComponent } from '../../../../../shared/components/dialogs/dialog-shell/dialog-shell.component';
import { SteppedPanelLayoutComponent } from '../../../../../shared/components/stepped-panel-layout/stepped-panel-layout.component';
import {
  ProjectDetailOutput,
  ProjectTeamMembersInput,
  TeamWithMembersOutput,
} from '../../../models/company-management.model';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { StepProgressConfig } from '../../../../../shared/types/step-progress.types';
import { ButtonColorType } from '../../../../../shared/types/button.types';

export interface ProjectDialogData {
  project: ProjectDetailOutput | null;
  teams: TeamWithMembersOutput[];
  linkedTeams: ProjectTeamMembersInput[];
}

export interface ProjectDialogResult {
  confirmed: true;
  name: string;
  clientName: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  teams: ProjectTeamMembersInput[];
}

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
  selector: 'app-project-dialog',
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonComponent,
    TextInputComponent,
    TextareaInputComponent,
    DaterangeInputComponent,
    CheckboxInputComponent,
    DialogShellComponent,
    SteppedPanelLayoutComponent,
  ],
  templateUrl: './project-dialog.component.html',
  styleUrl: './project-dialog.component.scss',
})
export class ProjectDialogComponent {
  private dialogRef = inject(MatDialogRef<ProjectDialogComponent>);
  private translationService = inject(TranslationService);
  protected data = inject<ProjectDialogData>(MAT_DIALOG_DATA);

  private static readonly DIALOG_WIDTH = 'min(680px, 95vw)';
  private static readonly DIALOG_WIDTH_INFO = 'min(900px, 95vw)';

  readonly isEdit = computed(() => this.data.project !== null);
  readonly currentStep = signal(1);
  readonly infoOpen = signal(false);

  readonly nameControl = new FormControl(this.data.project?.name ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });

  readonly clientNameControl = new FormControl(this.data.project?.clientName ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
  });

  readonly descriptionControl = new FormControl(this.data.project?.description ?? '', {
    nonNullable: true,
  });

  readonly datesGroup = new FormGroup(
    {
      start: new FormControl<Date | null>(parseIsoDate(this.data.project?.startDate)),
      end: new FormControl<Date | null>(parseIsoDate(this.data.project?.endDate)),
    },
    { validators: [dateRangeValidator] },
  );

  readonly dateErrorMessages: Record<string, string> = {
    invalidRange: this.translationService.translate('workspace.projects.dialog.dates.invalidRange'),
  };

  readonly teamControls = new Map<string, FormControl<boolean>>();
  readonly memberControls = new Map<string, FormControl<boolean>>();

  constructor() {
    effect(() => {
      this.dialogRef.updateSize(
        this.infoOpen()
          ? ProjectDialogComponent.DIALOG_WIDTH_INFO
          : ProjectDialogComponent.DIALOG_WIDTH,
      );
    });

    const linkedMap = new Map(
      (this.data.linkedTeams ?? []).map((linked) => [linked.teamId, new Set(linked.memberIds)]),
    );
    for (const team of this.data.teams ?? []) {
      const linked = linkedMap.get(team.id);
      this.teamControls.set(
        team.id,
        new FormControl<boolean>(linked !== undefined, { nonNullable: true }),
      );
      for (const member of team.members) {
        this.memberControls.set(
          this.memberKey(team.id, member.userId),
          new FormControl<boolean>(linked?.has(member.userId) ?? false, { nonNullable: true }),
        );
      }
    }
  }

  protected get stepProgressConfig(): StepProgressConfig {
    return {
      steps: [
        {
          label: this.translationService.translate('workspace.projects.dialog.steps.details'),
          ariaLabel: this.translationService.translate('workspace.projects.dialog.steps.details'),
          disabled: false,
          buttonColor: this.stepButtonColor(1),
        },
        {
          label: this.translationService.translate('workspace.projects.dialog.steps.teams'),
          ariaLabel: this.translationService.translate('workspace.projects.dialog.steps.teams'),
          disabled: this.currentStep() === 1 && !this.isStep1Valid(),
          buttonColor: this.stepButtonColor(2),
        },
      ],
    };
  }

  private stepButtonColor(step: number): ButtonColorType {
    return step <= this.currentStep() || this.isStep1Valid() ? 'primary' : 'secondary';
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

  private isStep1Valid(): boolean {
    return this.nameControl.valid && this.clientNameControl.valid && this.datesGroup.valid;
  }

  goToStep(step: number): void {
    if (step === 2 && !this.isStep1Valid()) return;
    this.currentStep.set(step);
  }

  nextStep(): void {
    this.nameControl.markAsTouched();
    this.clientNameControl.markAsTouched();
    this.descriptionControl.markAsTouched();
    this.datesGroup.markAllAsTouched();
    if (!this.isStep1Valid()) return;
    this.currentStep.set(2);
  }

  previousStep(): void {
    this.currentStep.set(1);
  }

  confirm(): void {
    this.nameControl.markAsTouched();
    this.clientNameControl.markAsTouched();
    this.descriptionControl.markAsTouched();
    this.datesGroup.markAllAsTouched();

    if (!this.isStep1Valid()) {
      this.currentStep.set(1);
      return;
    }

    const description = this.descriptionControl.value.trim();
    const result: ProjectDialogResult = {
      confirmed: true,
      name: this.nameControl.value.trim(),
      clientName: this.clientNameControl.value.trim(),
      description: description.length > 0 ? description : null,
      startDate: formatIsoDate(this.datesGroup.get('start')?.value),
      endDate: formatIsoDate(this.datesGroup.get('end')?.value),
      teams: this.buildTeamsPayload(),
    };
    this.dialogRef.close(result);
  }

  private buildTeamsPayload(): ProjectTeamMembersInput[] {
    return (this.data.teams ?? [])
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

  cancel(): void {
    this.dialogRef.close();
  }
}
