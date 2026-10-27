import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  Output,
  inject,
  TemplateRef,
  OnDestroy,
  Renderer2,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverOptions, PopoverPosition } from '../../types';

const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 12;

@Component({
  selector: 'app-popover',
  imports: [CommonModule],
  templateUrl: './popover.component.html',
  styleUrl: './popover.component.scss',
})
export class PopoverComponent implements OnDestroy {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private injector = inject(Injector);

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
  private removeListeners: Array<() => void> = [];
  private repositionFrame: number | null = null;

  get contentClasses(): Record<string, boolean> {
    return {
      'popover__content': true,
      [`popover__content--${this.calculatedPosition}`]: true,
      'popover__content--with-arrow': !!this.options.showArrow,
    };
  }

  ngOnDestroy(): void {
    this.detachListeners();
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
    this.attachListeners();
    this.changeDetectorRef.markForCheck();
    afterNextRender(() => this.updatePosition(), { injector: this.injector });
  }

  close(): void {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.detachListeners();
    this.changeDetectorRef.markForCheck();
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (this.options.closeOnClickOutside) {
      this.close();
    }
  }

  // Os listeners globais só existem com o popover aberto. O scroll usa captura porque o
  // scroller da página é o <main>, e não a janela.
  private attachListeners(): void {
    if (this.removeListeners.length > 0) {
      return;
    }

    this.removeListeners = [
      this.renderer.listen('document', 'click', (event: MouseEvent) => this.onClickOutside(event)),
      this.renderer.listen('document', 'keydown.escape', () => this.onEscape()),
      this.renderer.listen('document', 'scroll', (event: Event) => this.onScroll(event), {
        capture: true,
        passive: true,
      }),
      this.renderer.listen('window', 'resize', () => this.scheduleReposition()),
    ];
  }

  private detachListeners(): void {
    this.removeListeners.forEach((remove) => remove());
    this.removeListeners = [];

    if (this.repositionFrame !== null) {
      cancelAnimationFrame(this.repositionFrame);
      this.repositionFrame = null;
    }
  }

  private onScroll(event: Event): void {
    if (this.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }
    this.scheduleReposition();
  }

  private scheduleReposition(): void {
    if (this.repositionFrame !== null) {
      return;
    }
    this.repositionFrame = requestAnimationFrame(() => {
      this.repositionFrame = null;
      this.updatePosition();
    });
  }

  private updatePosition(): void {
    const triggerElement = this.elementRef.nativeElement.querySelector('.popover > *:first-child');
    const contentElement = this.elementRef.nativeElement.querySelector('.popover__content');

    if (!contentElement || !triggerElement) {
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    const previousPosition = this.calculatedPosition;
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
      top = triggerRect.top - contentRect.height - ANCHOR_GAP;
    } else {
      top = triggerRect.bottom + ANCHOR_GAP;
    }

    // Sem espaço de nenhum lado, o conteúdo encosta na borda da viewport em vez de sair dela.
    const maxTop = viewportHeight - contentRect.height - VIEWPORT_MARGIN;
    const clampedTop = Math.max(VIEWPORT_MARGIN, Math.min(top, maxTop));
    const verticallyClamped = clampedTop !== top;
    top = clampedTop;

    let left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
    const maxLeft = viewportWidth - contentRect.width - VIEWPORT_MARGIN;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft));

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

      if (verticallyClamped) {
        this.renderer.setStyle(arrowElement, 'display', 'none');
      } else {
        this.renderer.removeStyle(arrowElement, 'display');
      }
    }

    if (this.calculatedPosition !== previousPosition) {
      this.changeDetectorRef.markForCheck();
    }
  }

  private onClickOutside(event: MouseEvent): void {
    if (!this.isOpen || !this.options.closeOnClickOutside) {
      return;
    }

    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.close();
    }
  }

  private onEscape(): void {
    if (!this.isOpen || !this.options.closeOnEscape) {
      return;
    }

    this.close();
  }
}
