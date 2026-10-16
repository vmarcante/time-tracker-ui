import { Component, OnInit, computed, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PopoverComponent } from '../../../../shared/components/popover/popover.component';
import { TimerService } from '../../services/timer.service';
import { ProjectPickerComponent } from '../project-picker/project-picker.component';
import { ProjectSummaryOutput } from '../../../main/models/company-management.model';
import { AuthTokenService } from '../../../auth/services/auth-token.service';

@Component({
  selector: 'app-timer-widget',
  imports: [CommonModule, TranslatePipe, IconComponent, PopoverComponent, ProjectPickerComponent],
  templateUrl: './timer-widget.component.html',
  styleUrl: './timer-widget.component.scss',
})
export class TimerWidgetComponent implements OnInit {
  private router = inject(Router);
  private authTokenService = inject(AuthTokenService);
  protected timer = inject(TimerService);

  protected readonly isAuthenticated = this.authTokenService.isAuthenticated;

  private pickerPopover = viewChild<PopoverComponent>('pickerPopover');

  readonly formattedElapsed = computed(() => {
    const totalSeconds = this.timer.elapsedSeconds();
    const pad = (value: number): string => value.toString().padStart(2, '0');
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.timer.init();
    }
  }

  onProjectSelected(project: ProjectSummaryOutput | null): void {
    this.pickerPopover()?.close();
    this.timer.start(project ? { projectId: project.id } : {});
  }

  stopTimer(): void {
    this.timer.stop();
  }

  openEntry(): void {
    const entryId = this.timer.runningEntryId();
    if (entryId) {
      this.router.navigate(['/tracker/entries', entryId]);
    }
  }
}
