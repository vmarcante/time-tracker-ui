import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout-footer',
  imports: [CommonModule],
  templateUrl: './layout-footer.component.html',
  styleUrls: ['./layout-footer.component.scss'],
})
export class LayoutFooterComponent {
  currentYear = new Date().getFullYear();
}
