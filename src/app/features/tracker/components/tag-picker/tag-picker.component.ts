import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ApiAdapterService } from '../../../../shared/services/api/api-adapter.service';
import { TrackerApiService } from '../../services/tracker.api.service';
import { TagOutput } from '../../models/tracker.model';

/**
 * Chips de seleção de tags (usado no accordion do project-picker). O estado de
 * seleção fica no pai — este componente só notifica toggles.
 */
@Component({
  selector: 'app-tag-picker',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './tag-picker.component.html',
  styleUrl: './tag-picker.component.scss',
})
export class TagPickerComponent implements OnInit {
  private trackerApi = inject(TrackerApiService);
  private apiAdapter = inject(ApiAdapterService);

  readonly selectedIds = input<ReadonlySet<string>>(new Set());
  readonly toggle = output<TagOutput>();

  readonly allTags = signal<TagOutput[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.apiAdapter.executeRequest(this.trackerApi.listTags(), {
      ignoreLoading: true,
      onSuccess: (response) => {
        this.allTags.set(response.data);
        this.loading.set(false);
      },
      onError: () => this.loading.set(false),
    });
  }

  isSelected(tagId: string): boolean {
    return this.selectedIds().has(tagId);
  }
}
