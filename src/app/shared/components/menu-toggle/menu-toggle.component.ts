import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-toggle',
  imports: [CommonModule],
  templateUrl: './menu-toggle.component.html',
  styleUrl: './menu-toggle.component.scss',
})
export class MenuToggleComponent {
  isOpen = input.required<boolean>();
  ariaLabel = input<string>('');
  toggle = output<void>();
}
