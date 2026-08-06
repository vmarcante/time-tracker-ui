import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { DialogShellComponent } from '../dialog-shell/dialog-shell.component';

@Component({
  selector: 'app-dialog',
  templateUrl: './base-dialog.component.html',
  styleUrls: ['./base-dialog.component.scss'],
  imports: [NgTemplateOutlet, DialogShellComponent],
  standalone: true,
})
export class BaseDialogComponent {
  @Input() title?: string;
  @Input() content?: TemplateRef<any>;
  @Input() compact?: boolean = false;
  @Input() footerContent?: TemplateRef<any> | null;
  @Input() closeable?: boolean = true;
  @Input() warning?: boolean = false;

  @Output() closeClick = new EventEmitter<void>();

  protected get dialogClasses(): Record<string, boolean> {
    return {
      'dialog-content': true,
      'dialog-content--compact': !!this.compact,
    };
  }
}
