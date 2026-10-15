import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutHeaderComponent } from '../../main/components/layout/header/layout-header.component';
import { LayoutFooterComponent } from '../../main/components/layout/footer/layout-footer.component';
import { WorkspaceSidebarComponent } from './workspace-sidebar.component';

@Component({
  selector: 'app-workspace-layout',
  imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent, WorkspaceSidebarComponent],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {}
