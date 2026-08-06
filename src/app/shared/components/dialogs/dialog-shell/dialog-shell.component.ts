import { Component, Input } from '@angular/core';
import { DialogHeaderComponent } from '../dialog-header/dialog-header.component';

@Component({
  selector: 'app-dialog-shell',
  imports: [DialogHeaderComponent],
  templateUrl: './dialog-shell.component.html',
  styleUrl: './dialog-shell.component.scss',
})
export class DialogShellComponent {
  @Input() closeable: boolean = true;
  @Input() closeConfirmation: boolean = false;
  @Input() closeConfirmationMessage?: string;
}
