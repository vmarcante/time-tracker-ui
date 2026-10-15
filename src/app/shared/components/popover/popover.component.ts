import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  TemplateRef,
  AfterViewInit,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverOptions, PopoverPosition } from '../../types';

@Component({
  selector: 'app-popover',
  imports: [CommonModule],
  templateUrl: './popover.component.html',
  styleUrl: './popover.component.scss',
})
export class PopoverComponent implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  @Input() options: PopoverOptions = {
    position: 'bottom',
    width: '320px',
    closeOnClickOutside: true,
    closeOnEscape: true,
    showArrow: true,
  };

  @Input() triggerTemplate: TemplateRef<any> | null = null;
  @Input() contentTemplate: TemplateRef<any> | null = null;

  @Output() closed = new EventEmitter<void>();

  isOpen = false;
  calculatedPosition: PopoverPosition = 'bottom';
  arrowOffset: string = '1.5rem';
  private scrollListener: (() => void) | null = null;

  get contentClasses(): Record<string, boolean> {
    return {
      'popover__content': true,
      [`popover__content--${this.calculatedPosition}`]: true,
      'popover__content--with-arrow': !!this.options.showArrow,
    };
  }

  ngAfterViewInit(): void {
    this.scrollListener = this.renderer.listen('window', 'scroll', () => this.updatePosition(), { passive: true });
    this.updatePosition();
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      this.scrollListener();
    }
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen = true;
    setTimeout(() => this.updatePosition(), 0);
  }

  close(): void {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.closed.emit();
  }

  private updatePosition(): void {
    const triggerElement = this.elementRef.nativeElement.querySelector('.popover > *:first-child');
    const contentElement = this.elementRef.nativeElement.querySelector('.popover__content');

    if (!contentElement || !triggerElement) {
      this.calculatedPosition = 'bottom';
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    if (this.options.position === 'auto') {
      if (spaceBelow < contentRect.height && spaceAbove > contentRect.height) {
        this.calculatedPosition = 'top';
      } else {
        this.calculatedPosition = 'bottom';
      }
    } else {
      this.calculatedPosition = this.options.position || 'bottom';
    }

    let top = 0;
    if (this.calculatedPosition === 'top') {
      top = triggerRect.top - contentRect.height - 12;
    } else {
      top = triggerRect.bottom + 12;
    }

    let left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
    const maxLeft = viewportWidth - contentRect.width - 16;
    const minLeft = 16;

    if (left > maxLeft) {
      left = maxLeft;
    } else if (left < minLeft) {
      left = minLeft;
    }

    this.renderer.setStyle(contentElement, 'position', 'fixed');
    this.renderer.setStyle(contentElement, 'top', `${top}px`);
    this.renderer.setStyle(contentElement, 'left', `${left}px`);
    this.renderer.setStyle(contentElement, 'right', 'auto');
    this.renderer.setStyle(contentElement, 'bottom', 'auto');

    const arrowElement = contentElement.querySelector('.popover__arrow');
    if (arrowElement && this.options.showArrow) {
      const arrowOffset = triggerRect.left + (triggerRect.width / 2) - left - 8;
      this.arrowOffset = `${arrowOffset}px`;
      this.renderer.setStyle(arrowElement, 'left', this.arrowOffset);
      this.renderer.setStyle(arrowElement, 'right', 'auto');
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.isOpen || !this.options.closeOnClickOutside) {
      return;
    }

    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isOpen || !this.options.closeOnEscape) {
      return;
    }

    this.close();
  }
}
