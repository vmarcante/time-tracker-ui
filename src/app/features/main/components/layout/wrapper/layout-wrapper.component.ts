import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutHeaderComponent } from '../header/layout-header.component';
import { LayoutFooterComponent } from '../footer/layout-footer.component';

@Component({
  selector: 'app-layout-wrapper',
  imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent],
  templateUrl: './layout-wrapper.component.html',
  styleUrl: './layout-wrapper.component.scss',
})
export class LayoutWrapperComponent {}
