import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  imports: [CommonModule],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  @Input() name: string = '';
  @Input() color?: string;
  @Input() size?: string | number = '1rem';

  protected get iconStyles(): Record<string, string> {
    const styles: Record<string, string> = {};

    if (this.color) {
      styles['background-color'] = this.color;
    }

    if (this.size) {
      const sizeValue = typeof this.size === 'number' ? `${this.size}px` : this.size;
      styles['width'] = sizeValue;
      styles['height'] = sizeValue;
    }

    if (this.name) {
      styles['-webkit-mask-image'] = `url('assets/icons/${this.name}.svg')`;
      styles['mask-image'] = `url('assets/icons/${this.name}.svg')`;
    }

    return styles;
  }
}
