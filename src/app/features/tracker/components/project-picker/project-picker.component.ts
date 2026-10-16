import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text/text-input.component';
import { InlineInputComponent } from '../../../../shared/components/inputs/inline/inline-input.component';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { TrackerApiService } from '../../services/tracker.api.service';
import { CompanyManagementApiService } from '../../../main/services/company-management.api.service';
import {
  CreateProjectOutput,
  ProjectSummaryOutput,
} from '../../../main/models/company-management.model';
import { TagOutput } from '../../models/tracker.model';
import { TagPickerComponent } from '../tag-picker/tag-picker.component';
import { AuthTokenService } from '../../../auth/services/auth-token.service';

interface ProjectGroup {
  labelKey: string;
  projects: ProjectSummaryOutput[];
}

/** Payload do picker: projeto escolhido + atributos da entry (quando `withEntryFields`). */
export interface ProjectPickerSelection {
  project: ProjectSummaryOutput | null;
  name: string | null;
  tagIds: string[];
}

@Component({
  selector: 'app-project-picker',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    TextInputComponent,
    InlineInputComponent,
    TagPickerComponent,
  ],
  templateUrl: './project-picker.component.html',
  styleUrl: './project-picker.component.scss',
})
export class ProjectPickerComponent implements OnInit {
  private trackerApi = inject(TrackerApiService);
  private companyApi = inject(CompanyManagementApiService);
  private apiAdapter = inject(ApiAdapterService);
  private authTokenService = inject(AuthTokenService);

  /** Quick-start: mostra input de nome e seletor de tags acima da lista de projetos. */
  readonly withEntryFields = input(false);

  // O nome evita colidir com o evento DOM `select` (dispara ao selecionar
  // texto no input, ex.: Ctrl+A) — o Angular registra o listener DOM no host
  // além do output, então `select` dispararia o handler com um Event nativo.
  readonly selected = output<ProjectPickerSelection>();

  readonly groups = signal<ProjectGroup[]>([]);
  readonly loading = signal(true);
  readonly showCreate = signal(false);
  readonly creating = signal(false);

  readonly entryName = signal('');
  readonly selectedTags = signal<TagOutput[]>([]);
  /** null = "Sem projeto"; undefined = nada selecionado (modo sem entry fields). */
  readonly selectedProject = signal<ProjectSummaryOutput | null | undefined>(undefined);
  /** Accordion exclusivo: painel aberto na modal (só no modo entry fields). */
  readonly openPanel = signal<'tags' | 'projects' | null>(null);

  readonly showProjectList = computed(
    () => !this.withEntryFields() || this.openPanel() === 'projects',
  );
  readonly selectedTagIds = computed<ReadonlySet<string>>(
    () => new Set(this.selectedTags().map((t) => t.id)),
  );

  readonly newProjectName = new FormControl<string>('');
  readonly newClientName = new FormControl<string>('');

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly search = signal('');

  private filterGroup(projects: ProjectSummaryOutput[]): ProjectSummaryOutput[] {
    const term = this.search();
    if (!term) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        (project.clientName ?? '').toLowerCase().includes(term),
    );
  }

  readonly personalProjects = computed(() =>
    this.filterGroup(this.groups().find((g) => g.labelKey === 'tracker.projectPicker.personal')?.projects ?? []),
  );

  readonly companyProjects = computed(() =>
    this.filterGroup(this.groups().find((g) => g.labelKey === 'tracker.projectPicker.company')?.projects ?? []),
  );

  /** Duas colunas só quando há projetos de empresa; senão pessoal ocupa tudo. */
  readonly twoColumns = computed(() => this.companyProjects().length > 0);

  ngOnInit(): void {
    if (this.withEntryFields()) {
      this.selectedProject.set(null);
    }

    this.searchControl.valueChanges.subscribe((value) =>
      this.search.set((value ?? '').trim().toLowerCase()),
    );

    const companyId = this.authTokenService.currentUser()?.companyId ?? null;

    this.apiAdapter.executeRequest(this.trackerApi.listPersonalProjects(), {
      ignoreLoading: true,
      onSuccess: (response) => {
        if (response.data.content.length > 0) {
          this.groups.update((groups) => [
            ...groups,
            { labelKey: 'tracker.projectPicker.personal', projects: response.data.content },
          ]);
        }
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });

    if (companyId) {
      this.apiAdapter.executeRequest(this.companyApi.listMyProjects(companyId), {
        ignoreLoading: true,
        onSuccess: (response) => {
          if (response.data.content.length > 0) {
            this.groups.update((groups) => [
              ...groups,
              { labelKey: 'tracker.projectPicker.company', projects: response.data.content },
            ]);
          }
        },
      });
    }
  }

  onNameSave(name: string): void {
    this.entryName.set(name);
  }

  togglePanel(panel: 'tags' | 'projects'): void {
    this.openPanel.update((open) => (open === panel ? null : panel));
  }

  onTagToggle(tag: TagOutput): void {
    this.selectedTags.update((tags) =>
      tags.some((t) => t.id === tag.id) ? tags.filter((t) => t.id !== tag.id) : [...tags, tag],
    );
  }

  private emitSelection(project: ProjectSummaryOutput | null): void {
    const name = this.entryName().trim();
    this.selected.emit({
      project,
      name: name.length > 0 ? name : null,
      tagIds: this.selectedTags().map((t) => t.id),
    });
  }

  onSelect(project: ProjectSummaryOutput): void {
    // Clicar no projeto já selecionado desseleciona (volta a "sem projeto").
    const next = this.selectedProject()?.id === project.id ? null : project;
    // Sem entry fields (ex.: reatribuir projeto na página de detalhe) o clique já emite.
    if (!this.withEntryFields()) {
      this.emitSelection(next);
      return;
    }
    this.selectedProject.set(next);
  }

  startEntry(): void {
    this.emitSelection(this.selectedProject() ?? null);
  }

  toggleCreate(): void {
    this.showCreate.update((v) => !v);
    this.newProjectName.setValue('');
    this.newClientName.setValue('');
  }

  canCreate(): boolean {
    return (
      (this.newProjectName.value ?? '').trim().length >= 2 &&
      (this.newClientName.value ?? '').trim().length >= 2 &&
      !this.creating()
    );
  }

  createPersonalProject(): void {
    if (!this.canCreate()) {
      return;
    }

    this.creating.set(true);
    this.apiAdapter.executeRequest(
      this.trackerApi.createPersonalProject({
        name: (this.newProjectName.value ?? '').trim(),
        clientName: (this.newClientName.value ?? '').trim(),
        description: null,
        startDate: null,
        endDate: null,
      }),
      {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.creating.set(false);
          const summary = this.toSummary(response.data);
          this.groups.update((groups) => {
            const idx = groups.findIndex((g) => g.labelKey === 'tracker.projectPicker.personal');
            return idx >= 0
              ? groups.map((g, i) => (i === idx ? { ...g, projects: [...g.projects, summary] } : g))
              : [...groups, { labelKey: 'tracker.projectPicker.personal', projects: [summary] }];
          });
          if (!this.withEntryFields()) {
            this.emitSelection(summary);
            return;
          }
          this.selectedProject.set(summary);
          this.showCreate.set(false);
        },
        onError: () => this.creating.set(false),
      },
    );
  }

  private toSummary(created: CreateProjectOutput): ProjectSummaryOutput {
    return {
      id: created.id,
      name: created.name,
      clientName: created.clientName,
      status: created.status,
      teamCount: 0,
      memberCount: 0,
    };
  }
}
