import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutHeaderComponent } from '../../main/components/layout/header/layout-header.component';
import { LayoutFooterComponent } from '../../main/components/layout/footer/layout-footer.component';

@Component({
  selector: 'app-tracker-layout',
  imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent],
  templateUrl: './tracker-layout.component.html',
  styleUrl: './tracker-layout.component.scss',
})
export class TrackerLayoutComponent {}
