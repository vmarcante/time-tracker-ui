import { Component } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { RecentTimeEntriesComponent } from '../../../main/components/time-entries/recent-entries/recent-time-entries.component';

@Component({
  selector: 'app-tracker-entries-page',
  imports: [TranslatePipe, RecentTimeEntriesComponent],
  templateUrl: './tracker-entries-page.component.html',
  styleUrl: './tracker-entries-page.component.scss',
})
export class TrackerEntriesPageComponent {}
