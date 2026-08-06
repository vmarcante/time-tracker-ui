import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { CurrentUserOutput } from '../../models';

@Component({
  selector: 'app-user-menu',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  user = input.required<CurrentUserOutput>();
  logout = output<void>();

  getInitials(): string {
    const name = this.user().name;
    const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);

    if (parts.length === 0) {
      return '';
    }

    if (parts.length === 1) {
      return parts[0]!.charAt(0).toUpperCase();
    }

    const first = parts[0]!.charAt(0).toUpperCase();
    const last = parts[parts.length - 1]!.charAt(0).toUpperCase();
    return `${first}${last}`;
  }
}
