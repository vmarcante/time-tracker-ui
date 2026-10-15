import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkspaceSidebarComponent } from './workspace-sidebar.component';

@Component({
  selector: 'app-workspace-layout',
  imports: [RouterOutlet, WorkspaceSidebarComponent],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {}
